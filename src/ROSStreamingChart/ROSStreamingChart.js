import React, {
  Component
} from 'react';
import Popup from "reactjs-popup";
import 'font-awesome/css/font-awesome.min.css'; 
import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import {
  Line
} from 'react-chartjs-2';
import 'chartjs-plugin-streaming';
import 'chartjs-plugin-zoom';
import './ROSStreamingChart.css';
import ROSBridgeConnection from '../ROSBridgeConnection/ROSBridgeConnection';

import {
  SelectionData,
  TopicCheckboxTree,
  getNode,
  selectChildrenFromSource,
  applyChangesInSource
} from '../TopicCheckboxTree/TopicCheckboxTree';

const ROSLIB = require("roslib");
var CHART_COLORS = [
  'rgb(255, 99, 132)', //red
  'rgb(255, 159, 64)', //orange
  'rgb(255, 205, 86)', //yellow
  'rgb(75, 192, 192)', //green
  'rgb(54, 162, 235)', //blue
  'rgb(153, 102, 255)', //purple
  'rgb(201, 203, 207)' //grey
];

function IsNumeric(val) {
    return Number(parseFloat(val)) === val;
}

class ROSStreamingChart extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ros: null,
      rosbridgeUrl: 'ws://localhost:9090',

      topicList: {'topics': [], 'types': []},
      msgList: {},

      data: new SelectionData([], [], []),
      editLinesOpen: false

    };
    this.topics = {}
    this.chartReference = null;
    this.color_index = 0
  }
  updateSelectedLines(data){
    // remove not selected lines
    const labels = Array.from(this.chartReference.chartInstance.data.labels)
    console.log('update: remove', labels, data.selection)
    for(var i in labels){
      console.log('inside for ', labels[i], !(data.selection.includes(labels[i])))
      if(!(data.selection.includes(labels[i]))){
        this.removeLineFromChart(labels[i])
      }
    }
    // add selected lines
    for(i in data.selection){
      const node = getNode(data.selection[i], data.source)
      const root_node = getNode(node.root, data.source)
      if(!node['children']){ //if node don't have children, it is leaf node. 
        this.addLine(node.value, root_node.value, root_node.type)
      }
    }
    // register callback
    for(var topic_name in this.topics){
      this.topics[topic_name].topic.subscribe(message => {
        // console.log('Received message on : ', message, topic_name);

        var time = Date.now()
        // if(message['header']['stamp']){
        //   time = Math.round(message.header.stamp.secs * 1000 + message.header.stamp.nsecs / 1e6)
        // }
        // console.log('msg time', time, Date.now())

        var lines = this.topics[topic_name].lines
        for (var i in lines) {
          //parse data
          const fieldname = lines[i].substr(topic_name.length + 1, lines[i].length) //remove topic_name
          const fieldnames = fieldname.split('/')
          var data = message
          for (var j in fieldnames) {
            data = data[fieldnames[j]]
          }

          // todo add error handling
          // remove from line if data is array
          if(Array.isArray(data)){
            lines.splice(i, 1)
          }
          // not remove since error in just one msg
          if(!IsNumeric(data)){
            return
          }

          this.chartReference.chartInstance.data.datasets.forEach(function(dataset) {
            if (dataset['label'] === lines[i]) {
              dataset.data.push({
                t: time, //Date.now(), //message.header.stamp.secs// + message.header.stamp.nsecs*10e9,//
                y: data
              });
              this.chartReference.chartInstance.update({
                preservation: true
              });
              return
            }
          }, this);
            this.chartReference.chartInstance.update()
        }
      });
    }

    this.setState({
      data: data,
      editLinesOpen: false
    })
  }
  addLine(line_name, topic_name, topic_type){
    console.log(this.topics, topic_name, topic_name in this.topics)
    if(!(topic_name in this.topics) ){
      this.topics[topic_name] = {
        'topic': new ROSLIB.Topic({
          ros: this.state.ros,
          name: topic_name,
          messageType: topic_type
        }),
        'lines': [line_name]
      }
    }else{
      console.log(line_name, this.topics[topic_name].lines, this.topics[topic_name].lines.includes(topic_name))
      if(!(this.topics[topic_name].lines.includes(line_name))){
        this.topics[topic_name].lines.push(line_name)
      }else{
        return
      }
    }
    this.addLine2Chart(line_name)
  }
  addLine2Chart(line_name) {
    console.log('addLine', line_name)
    this.chartReference.chartInstance.data.datasets.push({
      label: line_name,
      borderColor: CHART_COLORS[CHART_COLORS.length % this.color_index],
      backgroundColor: CHART_COLORS[CHART_COLORS.length % this.color_index],
      fill: false,
      lineTension: 0,
      borderDash: [8, 4],
      data: []
    })
    this.chartReference.chartInstance.data.labels.push(line_name)
    this.chartReference.chartInstance.update()
    this.color_index++
  }
  removeLineFromChart(line_name) {
    //remove from chart data
    console.log('removeLine', line_name, this.state.data.selection, this.chartReference.chartInstance.data.datasets)
    var datasets = this.chartReference.chartInstance.data.datasets
    for (var i = 0; i < datasets.length; i++) {
      if (datasets[i]['label'] === line_name) {
        datasets.splice(i, 1)
        break
      }
    }
    var labels = this.chartReference.chartInstance.data.labels
    for (i in labels) {
      if (labels[i] === line_name) {
        labels.splice(i, 1)
      }
    }

    //remove from lines in topic
    for (var topic_name in this.topics) {
      for (i = 0; i < this.topics[topic_name].lines.length; i++) {
        if (this.topics[topic_name].lines[i] === line_name) {
          this.topics[topic_name].lines.splice(i, 1)
          break
        }
      }
    }

    this.chartReference.chartInstance.update()
  }
  getRosInstance(ros, msgList, topicList) {
    // console.log('getRosInstance', ros, msgList, topicList)
    this.setState({
      ros: ros,
      msgList: msgList,
      topicList: topicList,
    })
  }
  
  render() {
    const data = {
      labels: [],
      datasets: []
    };
    const options = {
      // title: {
      //   display: true,
      //   text: 'Line chart (hotizontal scroll) sample'
      // },
      scales: {
        xAxes: [{
          type: 'realtime',
          realtime: {
            // displayFormats: {
            //   second: 'h:mm:ss a',
            //   // millisecond: 'h:mm:ss.SSS a',
            //   // minute: 'h:mm a'
            // }
          },
          // ticks: {
          //     // Include a dollar sign in the ticks
          //     callback: function(value, index, values) {
          //         // console.log(value, values[index].value, 
          //         //   values[index].label, values[index])
          //         return '$' + value;
          //     }
          // } 
        }]
      },
      tooltips: {
        mode: 'nearest',
        intersect: false
      },
      animation: {
        duration: 0 // general animation time
      },
      hover: {
        mode: 'nearest',
        intersect: false,
        animationDuration: 0 // duration of animations when hovering an item
      },
      responsiveAnimationDuration: 0, // animation duration after a resize
      plugins: {
        streaming: {
          frameRate: 1 // chart is drawn 5 times every second
        }
      },
      pan: {
        enabled: true, // Enable panning
        mode: 'x', // Allow panning in the x direction
        rangeMin: {
          x: null // Min value of the delay option
        },
        rangeMax: {
          x: null // Max value of the delay option
        }
      },
      zoom: {
        enabled: true, // Enable zooming
        mode: 'x', // Allow zooming in the x direction
        rangeMin: {
          x: null // Min value of the duration option
        },
        rangeMax: {
          x: null // Max value of the duration option
        }
      },
      // layout: {
      //     padding: {
      //         left: 50,
      //         right: 50,
      //         top: 50,
      //         bottom: 50
      //     }
      // }
      maintainAspectRatio: false,
    };
    
    const customStyles = {
      width: '90%',
      height: '90%',
      overflow: 'scroll',
    };
  
    return ( 
      <div class="chart-container">
        <ROSBridgeConnection
          getRosInstance = {this.getRosInstance.bind(this)}
        />
        <Line ref = { (reference) => this.chartReference = reference }
          data = { this.chartReference ? this.chartReference.chartInstance.data : data }
          options = { this.chartReference ? this.chartReference.chartInstance.options : options }
        />
        <Popup trigger={<button>edit</button>} 
                open={this.state.editLinesOpen}
                onOpen={()=>this.setState({editLinesOpen:true})}
                position="right center"
                modal
                contentStyle={customStyles}
                closeOnDocumentClick
                >
          <TopicCheckboxTree topics={this.state.topicList} 
                           msgs={this.state.msgList} 
                           data={this.state.data}
                           onSubmit={this.updateSelectedLines.bind(this)}
           />
        </Popup>
      </div>
    );
  }
}


export default ROSStreamingChart;