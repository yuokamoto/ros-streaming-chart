import React, {
  Component
} from 'react';
import Select from 'react-select';
import {
  Line
} from 'react-chartjs-2';
import 'chartjs-plugin-streaming';
import 'chartjs-plugin-zoom';
import './App.css';

const ROSLIB = require("roslib");
const PLOTTABLE_MSGS = [
  'bool',
  'uint8', 'uint16', 'uint32', 'uint64',
  'int16', 'int32', 'int64',
  'float32', 'float64'
]
var CHART_COLORS = [
  'rgb(255, 99, 132)', //red
  'rgb(255, 159, 64)', //orange
  'rgb(255, 205, 86)', //yellow
  'rgb(75, 192, 192)', //green
  'rgb(54, 162, 235)', //blue
  'rgb(153, 102, 255)', //purple
  'rgb(201, 203, 207)' //grey
];

// const IGNORE_MSGS = [
//   'bool',
//  ]

class App extends Component {
  constructor(props) {
    console.warn('constructor')
    super(props);

    this.state = {
      ros: null,
      rosbridgeUrl: 'ws://localhost:9090',
      // topics: {},
      // topicList:{'topics':[], 'types':[]},
      // msgList:{},

      //state for add line
      selectedTopic: null,
      selectOptions: [],

      //state for remove line
      selectedLine: null

    };
    this.topics = {}
    this.topicList = {
      'topics': [],
      'types': []
    }
    this.msgList = {}
    this.chartReference = null;
    this.color_index = 0

    this.state.ros = new ROSLIB.Ros({
      url: this.state.rosbridgeUrl
    })

    this.state.ros.on('connection', () => {
      console.log('Connected to websocket server.');
      this.setState({
        state: this.state
      });
      this.updateTopicList()
    });

    this.state.ros.on('error', function(error) {
      console.log('Error connecting to websocket server: ', error);
    });

    this.state.ros.on('close', () => {
      console.log('Connection to websocket server closed.');
      this.setState({
        state: this.state
      });
    });

    setInterval(() => {
        // console.log(this.state.ros.isConnected)
        //todo 
        // add change image
        // this.addLine('test', 'test')
      },
      1000);

    // this.add_topic('/joint_states');

  }

  updateRosConnection() {
    if (this.state.ros.isConnected) {
      this.state.ros.close()
    } else {
      this.state.ros.connect(this.state.rosbridgeUrl)
    }
  }

  updateTopicList() {
    this.state.ros.getTopics((topics) => {
      // console.log("Getting topics...");
      // console.log(topics);

      //update selection options
      this.setState({
        selectOptions: []
      })
      topics.topics.forEach(function(topic) {
        this.state.selectOptions.push({
          label: topic
        })
      }, this)

      topics.types.forEach(function(msg_name) {
        if (!(msg_name in this.msgList)) {
          this.getMsgInfo(msg_name)
        }
      }, this)

      this.topicList = topics

    })
  }

  getTopicType(topic_name) {
    var index = this.topicList.topics.indexOf(topic_name)
    if (index < 0) {
      console.warn('topic is not in the topic list')
      this.updateTopicList()
      return
    }
    return this.topicList.types[index]
  }

  getMsgInfo(msg_name) {
    // console.log(msg_name)
    var msgDetailesClient = new ROSLIB.Service({
      ros: this.state.ros,
      name: '/rosapi/message_details',
      serviceType: 'rosapi/MessageDetails'
    });

    var request = new ROSLIB.ServiceRequest({
      type: msg_name
    });

    msgDetailesClient.callService(request, (result) => {
      console.log("Getting msginfo.: ", msg_name);
      result.typedefs.forEach((data) => {
        console.log(data.type, data)
        this.msgList[data.type] = data
      }, this)
    });

  }

  topicSelect(selected_option) {
    this.setState({
      selectedTopic: selected_option
    })
  }

  lineSelect(selected_option) {
    this.setState({
      selectedLine: selected_option
    })
  }

  addSelectedTopic() {
    if (!this.state.selectedTopic) {
      return
    }
    const topic_name = this.state.selectedTopic.label
    const topic_type = this.getTopicType(topic_name)
    console.log('addSelectedTopic', topic_name, this.msgList[this.getTopicType(topic_name)])

    this.lines = []
    this.addLines(topic_name, topic_type)
    this.topics[topic_name] = {
      'topic': new ROSLIB.Topic({
        ros: this.state.ros,
        name: topic_name,
        messageType: topic_type
      }),
      'lines': this.lines
    }
    this.topics[topic_name].topic.subscribe(message => {
      // console.log('Received message on : ', message);

      var time = message.header.stamp.secs + message.header.stamp.nsecs / 1e9
      var lines = this.topics[topic_name].lines
      for (var i in lines) {
        //parse data
        const fieldname = lines[i].name.substr(topic_name.length + 1, lines[i].name.length) //remove topic_name
        const fieldnames = fieldname.split('/')
        var data = message
        for (var j in fieldnames) {
          data = data[fieldnames[j]]
        }
        // console.log(data, Date.now())

        //array data
        if (lines[i].array > -1 && data.length > 0) { //todo dynamic change of data length
          for (var j; j < data.length; j++) {
            const line_name = lines[i].name + '/' + j.toString()
            const line_type = lines[i].type
            this.addLine2Chart(line_name, line_type)
            lines.push({ //add lines for array component
              name: line_name,
              type: line_type,
              array: -1
            })
          }
          lines.splice(i, 1) //limove lines of source array
        } else {
          this.chartReference.chartInstance.data.datasets.forEach(function(dataset) {
            if (dataset['label'] == lines[i].name) {
              dataset.data.push({
                t: Date.now(), //message.header.stamp.secs// + message.header.stamp.nsecs*10e9,//
                y: data
              });
              this.chartReference.chartInstance.update({
                preservation: true
              });
              return
            }
          }, this);
          // this.chartReference.chartInstance.update()
        }
      }
    });

  }
  addLines(topic_name, topic_type) {
    const msg = this.msgList[topic_type]
    console.log('add Topic', topic_name, topic_type, msg)
    for (var i in msg.fieldtypes) {
      var field_type = msg.fieldtypes[i]
      const field_name = topic_name + '/' + msg.fieldnames[i]
      if (msg.fieldnames[i] != 'header') {

        if (PLOTTABLE_MSGS.includes(field_type)) {
          //single msg
          if (msg.fieldarraylen[i] == -1) {
            this.addLine2Chart(field_name, field_type)
          } else {
            //array msg
            //not add line now since size is unknown until receive first msg.
            field_type += 'MultiArray'
          }
          this.lines.push({
            name: field_name,
            type: field_type,
            array: msg.fieldarraylen[i]
          })

        } else if (this.msgList[field_type]) {
          this.addLines(field_name, field_type)
        } else {
          console.log('not in the msgList', field_type)
        }

      }
    }
  }
  addLine2Chart(topic_name, topic_type) {
    // console.log(this.chartReference)
    console.log('addLine', topic_name, topic_type)
    // console.log(this.chartReference.props.data.datasets)
    // this.chartReference.props.data.datasets.push({
    this.chartReference.chartInstance.data.datasets.push({
      label: topic_name,
      borderColor: CHART_COLORS[CHART_COLORS.length % this.color_index],
      backgroundColor: CHART_COLORS[CHART_COLORS.length % this.color_index],
      fill: false,
      lineTension: 0,
      borderDash: [8, 4],
      data: []
    })
    this.chartReference.chartInstance.data.labels.push(topic_name)
    this.chartReference.chartInstance.update()
    this.color_index++
  }

  removeSelectedLine() {
    if (!this.state.selectedLine) {
      return
    }

    //remove from chart data
    var datasets = this.chartReference.chartInstance.data.datasets
    for (var i = 0; i < datasets.length; i++) {
      // console.log(datasets[i]['label'], this.state.selectedLine.label)
      if (datasets[i]['label'] == this.state.selectedLine.label) {
        datasets.splice(i, 1)
        break
      }
    }
    var labels = this.chartReference.chartInstance.data.labels
    for (var i in labels) {
      if (labels[i] == this.state.selectedLine.label) {
        labels.splice(i, 1)
      }
    }

    //remove from lines in topic
    for (var topic_name in this.topics) {
      // console.log(topic_name, this.topics)    
      for (var i = 0; i < this.topics[topic_name].lines.length; i++) {
        if (this.topics[topic_name].lines[i].name = this.state.selectedLine.label) {
          this.topics[topic_name].lines.splice(i, 1)
          break
        }
      }
    }

    this.chartReference.chartInstance.update()
    // console.log( this.chartReference.chartInstance)
  }

  rosbridgeUrlChange(event) {
    this.setState({
      rosbridgeUrl: event.target.value
    });
  }

  render() {
    // const onRefresh = (chart) => {this.refresh(chart)};
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
            displayFormats: {
              second: 'h:mm:ss a'
            }
          },
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
          frameRate: 5 // chart is drawn 5 times every second
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
      }
    };

    return ( <
      div >

      <
      div >
      <
      label > rosbridgeURL: < /label> <
      input type = "text"
      value = {
        this.state.rosbridgeUrl
      }
      onChange = {
        this.rosbridgeUrlChange.bind(this)
      }
      /> <
      button onClick = {
        this.updateRosConnection.bind(this)
      } > {
        this.state.ros.isConnected ? 'Disconnect' : 'Connect'
      } <
      /button> <
      button onClick = {
        this.updateTopicList.bind(this)
      } >
      update topic list <
      /button> < /
      div >

      <
      div >
      <
      Select value = {
        this.state.selectedTopic
      }
      onChange = {
        this.topicSelect.bind(this)
      }
      options = {
        this.state.selectOptions
      }
      /> <
      button onClick = {
        this.addSelectedTopic.bind(this)
      } > add < /button> <
      Select value = {
        this.state.selectedLine
      }
      onChange = {
        this.lineSelect.bind(this)
      }
      options = {
        this.chartReference ? this.chartReference.chartInstance.data.datasets : []
      }
      /> <
      button onClick = {
        this.removeSelectedLine.bind(this)
      } > remove < /button> < /
      div >

      <
      Line ref = {
        (reference) => this.chartReference = reference
      }
      data = {
        this.chartReference ? this.chartReference.chartInstance.data : data
      }
      options = {
        this.chartReference ? this.chartReference.chartInstance.options : options
      }
      /> < /
      div >
    );
  }
}


export default App;