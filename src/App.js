import React, {
  Component
} from 'react';
import Select from 'react-select';
import Popup from "reactjs-popup";
// import Modal from 'react-modal';
import CheckboxTree from 'react-checkbox-tree';
import 'font-awesome/css/font-awesome.min.css'; 
import 'react-checkbox-tree/lib/react-checkbox-tree.css';
// import 'react-checkbox-tree/src/less/react-checkbox-tree.less';
// import 'react-checkbox-tree/src/scss/react-checkbox-tree.scss';

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

function IsNumeric(val) {
    return Number(parseFloat(val)) === val;
}
function getNode(value, source, children_key='children'){
  for(var i in source){
    var res = null
    if(source[i].value===value){
      res = source[i]
    }else if(source[i][children_key]){
      res = getNode(value, source[i][children_key])
    }
    if(res){
      return res
    }
  }
}
function selectChildrenFromSource(source, selection, children_key='children'){
  for(var i in source){
    selection.push(source[i].value)
    if(source[i][children_key]){
      selectChildrenFromSource(source[i][children_key], selection)
    }
  }
}
function applyChangesInSource(source, key, value, children_key='children'){
  for(var i in source){
    if(source[i].array !== 0){
      source[i][key] = value
      if(source[i][children_key]){
        applyChangesInSource(source[i][children_key], key, value, children_key)
      }
    }
  }
}
class SelectionData {
  constructor(selection, source, expanded){
    this.selection = selection //list of selection
    this.source = source //dictionary include line information
    this.expanded = expanded
  }

  getNode(value, children_key='children'){
    getNode(value, this.source, children_key)  
  }
  selectChildrenFromSource(children_key='children'){
    selectChildrenFromSource(this.source, this.selection, children_key)
  }
  applyChangesInSource(key, value, children_key='children'){
    applyChangesInSource(this.source, key, value, children_key='children')
  }
}
class PopupContents extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
            data: this.props.data,
            arrayIndex: 0,
            arrayIndexInputOpen: false
        };
    this.selectedNode = null
    this.copyNodes = []
    this.addTopics()
    // console.log('popup constructor', this.props.topics, this.state.data.source)
  }

  addTopics() {
    const topics = this.props.topics.topics
    const types = this.props.topics.types
    // this.state.data.source = this.props.lineCandidates
    for(var i in topics){
      var exist = false
      for(var j in this.state.data.source){
        if(this.state.data.source[j].label === topics[i]){
          exist = true
        }
      }
      if(exist){
        continue
      }else{ 
        // add only new topics
        console.log('newly added topic: ' +  topics[i])
        const children = this.addExpandTopics(topics[i], types[i], topics[i])
        if(children.length>0){
            this.state.data.source.push({
                value: topics[i],
                label: topics[i],
                type: types[i],
                children: children,
                root:topics[i],
                leaf: false,
            })
        }
      }
    }
  }
  addExpandTopics(topic_name, topic_type, root_name, showCheckbox = true) {
    const msg = this.props.msgs[topic_type]
    // console.log('expand Topic', topic_name, topic_type, msg)
    var children = []
    for (var i in msg.fieldtypes) {
      var field_type = msg.fieldtypes[i]
      const field_name = topic_name + '/' + msg.fieldnames[i]
      if (msg.fieldnames[i] !== 'header') {
        if (PLOTTABLE_MSGS.includes(field_type)) {
          //single msg
          if (msg.fieldarraylen[i] === -1) {
            // this.addLine2Chart(field_name, field_type)
            // this.state.data.source.children.push()
          } else {
            //array msg
            //not add line now since size is unknown until receive first msg.
            field_type += 'MultiArray'
            showCheckbox = false
          }
          // console.log('reach leaf************')
          children.push({
            value: field_name,
            label: msg.fieldnames[i],
            type: field_type,
            array: msg.fieldarraylen[i],
            showCheckbox: showCheckbox,
            root: root_name,
          })
        } else if (this.props.msgs[field_type]) {
          if (msg.fieldarraylen[i] === -1) {
          } else {
            showCheckbox = false
          }
          // console.log('go one more inside************')
          const result = this.addExpandTopics(field_name, field_type, root_name=root_name, showCheckbox)
          if(result.length>0){
            children.push({
              value: field_name,
              label: msg.fieldnames[i],
              type: field_type,
              array: msg.fieldarraylen[i],
              children: result, 
              showCheckbox: showCheckbox,
              root: root_name,
            })
          }
        } else {
          console.log('not in the msgList', field_type)
        }
      }
    }

    return children
  }
  onAdd(){
    this.props.updateSelectedLines(this.state.data)
  }
  // getNode(value, source){
  //   // console.log('getnode', source, value) 
  //   for(var i in source){
  //     // console.log('  ', i, source[i].value, value)
  //     var res = null
  //     if(source[i].value===value){
  //       res = source[i]
  //     }else if(source[i]['children']){
  //       res = this.getNode(value, source[i].children)
  //     }
  //     if(res){
  //       return res
  //     }
  //   }
  // }
  onClick(targetNode){

    // if(targetNode.checkState===0){
    //   this.state.data.selection.push(targetNode.value)
    //   console.log('first', targetNode)
    // }else{
    //   for(var i in this.state.data.selection){
    //     if(this.state.data.selection[i]===targetNode.value){
    //       this.state.data.selection.splice(i,1)  
    //       console.log('seconnnnnnn')      
    //     }
    //     console.log('secon', targetNode)
    //   }
    // }
    // this.onCheck(this.state.data.selection, targetNode)
    
    var node = getNode(targetNode.value, this.state.data.source)  
    if(node.array>=0){
      this.selectedNode = node
      this.state.arrayIndex = 0
      this.setState({arrayIndexInputOpen: true });
      // console.log(node)
    }
  }
  onCheck(checked, targetNode){
    this.state.data.selection = checked
    this.setState({data:this.state.data})
    console.log('check', targetNode, this.state.data.source)
    // if(targetNode.checkState===0){
    //   var node = this.getNode(targetNode.value, this.state.data.source)
    //   if(node.array>=0){
    //     this.selectedNode = node
    //     this.state.arrayIndex = 0
    //     this.setState({arrayIndexInputOpen: true });
    //     // console.log(node)
    //   }else{
    //     this.setState({checked})
    //   }
    // }else{
    //   this.setState({checked})
    // }
  }
  // checkNodes(source){
  //   // console.log('checknodes', this.state.data.selection, source)
  //   for(var i in source){
  //     // console.log(i, source[i])
  //     this.state.data.selection.push(source[i].value)
  //     if(source[i]['children']){
  //       this.checkNodes(source[i]['children'])
  //     }
  //   }
  // }
  // updateShowCheckbox(source){
  //   for(var i in source){
  //     if(source[i].array !== 0){
  //       source[i].showCheckbox = true
  //       if(source[i]['children']){
  //         this.updateShowCheckbox(source[i]['children'])
  //       }
  //     }
  //   }
  // }
  onArrayIndexAdd(){
    var indexStr = this.state.arrayIndex.toString()
    var child = {
          value: this.selectedNode.value + '/' +  indexStr,
          label: indexStr,
          root: this.selectedNode.root
    }
    if(this.selectedNode.array==0){
      //if this node is not leaf, copy the all children as well.
      if(this.selectedNode['children']){
        child['children'] = JSON.parse(JSON.stringify(
              this.selectedNode['children']).replace(
                new RegExp(this.selectedNode.value +'/',"g"),
                this.selectedNode.value + '/' +  indexStr  + '/'
              )
            )
      }    
      this.selectedNode['children'] = [child]
    }else{
      //check already have
      for(var i in this.selectedNode['children']){
        if(this.selectedNode['children'][i].label===indexStr){
          this.setState({
            arrayIndexInputOpen: false
          });
          return
        }
      }
      if(this.selectedNode['children'][0]['children']){
        child['children'] = JSON.parse(JSON.stringify(
                this.selectedNode['children'][0]['children']).replace(
                  new RegExp(this.selectedNode['children'][0].value + '/',"g"),
                  this.selectedNode.value + '/' +  indexStr + '/'
                )
              )
      }
      this.selectedNode.children.push(child)
    }
    this.selectedNode.array += 1
    this.state.data.expanded.push(this.selectedNode.value)
    selectChildrenFromSource([child], this.state.data.selection)
    applyChangesInSource([child], 'showCheckbox', true)

    // todo 
    // I don't know why but need to substitute [] to nodes to rerender child.
    // other wise children will not shown.
    // in the onClose function, substitute temp_nodes to nodes back.
    this.copyNodes = Array.from(this.state.data.source)
    this.state.data.source = []
    this.setState({
      data: this.state.data,
      arrayIndexInputOpen: false  //don't know why this necessary
    });
  }
  onArrayIndexPopupClose(){
    // console.log('onArrayIndexPopupClose', this.copyNodes, this.state.data.selection)
    this.state.data.source = this.copyNodes
    this.setState({
      data: this.state.data,
      arrayIndexInputOpen: false
    });
  }
  onExpand(expanded, targetNode){
    this.state.data.expanded = expanded
    this.setState({data:this.state.data})
  }
  render() {
    // console.log('rendered---------------------------')
    return (
      <div className='popup'>
　      <button onClick={this.onAdd.bind(this)}>add</button>
        <CheckboxTree
                nodes={this.state.data.source}
                expandIconClass="fa fa-chevron-right"
                collapseIconClass="fa fa-chevron-down"
                nativeCheckboxes={true}
                showNodeIcon={false}
                checked={this.state.data.selection}
                expanded={this.state.data.expanded}
                onClick={ (targetNode) => this.onClick(targetNode)}
                onCheck={ (checked, targetNode) => this.onCheck(checked, targetNode)}
                onExpand={ (expanded, targetNode) => this.onExpand(expanded, targetNode)}
        />
        {/*input for array num*/}
        <Popup open={this.state.arrayIndexInputOpen}
                position="right center"
                closeOnDocumentClick
                onClose={this.onArrayIndexPopupClose.bind(this)}
                >
                <form onSubmit={this.onArrayIndexAdd.bind(this)}>
                  <label>Array Index:　</label>
                  <input type="number" 
                    value={this.state.arrayIndex} 
                    min='0'
                    onChange={ (e)=> this.setState({arrayIndex: Math.round(e.target.value)})} 
                  />
                  <input type="submit" value='add' />
                </form>
        </Popup>
      </div>
    );
  }
}
class App extends Component {
  constructor(props) {
    // console.warn('constructor')
    super(props);

    this.state = {
      ros: null,
      rosbridgeUrl: 'ws://localhost:9090',

      //state for add line
      selectedTopic: null,
      selectOptions: [],

      //state for remove line
      selectedLine: null,

      modalIsOpen: false,

      topicList: {'topics': [], 'types': []},
      msgList: {},

      data: new SelectionData([], [], []),
      addLinesOpen: false

    };
    this.topics = {}
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
      console.log("Getting topics...");
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
        if (!(msg_name in this.state.msgList)) {
          this.getMsgInfo(msg_name)
        }
      }, this)

      this.setState({topicList: topics})
    })
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

        // var time = message.header.stamp.secs + message.header.stamp.nsecs / 1e9
        var lines = this.topics[topic_name].lines
        for (var i in lines) {
          //parse data
          const fieldname = lines[i].substr(topic_name.length + 1, lines[i].length) //remove topic_name
          const fieldnames = fieldname.split('/')
          var data = message
          for (var j in fieldnames) {
            data = data[fieldnames[j]]
          }
          // console.log(data)
          // todo add error handling
          // remove from line if data is array
          if(Array.isArray(data)){
            lines.splice(i, 1)
          }
          // not remove since error in just one msg
          if(!IsNumeric(data)){
            return
          }
          // console.log(data, Date.now())

          this.chartReference.chartInstance.data.datasets.forEach(function(dataset) {
            if (dataset['label'] === lines[i]) {
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
            this.chartReference.chartInstance.update()
        }
      });
    }

    this.setState({
      data: data,
      addLinesOpen: false
    })
  }

  getTopicType(topic_name) {
    var index = this.state.topicList.topics.indexOf(topic_name)
    if (index < 0) {
      console.warn('topic is not in the topic list')
      this.updateTopicList()
      return
    }
    return this.state.topicList.types[index]
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
        this.state.msgList[data.type] = data
      }, this)
    });
  }

  // topicSelect(selected_option) {
  //   this.setState({
  //     selectedTopic: selected_option
  //   })
  // }

  // lineSelect(selected_option) {
  //   this.setState({
  //     selectedLine: selected_option
  //   })
  // }

  // addSelectedTopic() {
  //   if (!this.state.selectedTopic) {
  //     return
  //   }
  //   const topic_name = this.state.selectedTopic.label
  //   const topic_type = this.getTopicType(topic_name)
  //   console.log('addSelectedTopic', topic_name, this.state.msgList[this.getTopicType(topic_name)])

  //   this.lines = []
  //   this.addLines(topic_name, topic_type)
  //   this.topics[topic_name] = {
  //     'topic': new ROSLIB.Topic({
  //       ros: this.state.ros,
  //       name: topic_name,
  //       messageType: topic_type
  //     }),
  //     'lines': this.lines
  //   }
  //   this.topics[topic_name].topic.subscribe(message => {
  //     // console.log('Received message on : ', message);

  //     var time = message.header.stamp.secs + message.header.stamp.nsecs / 1e9
  //     var lines = this.topics[topic_name].lines
  //     for (var i in lines) {
  //       //parse data
  //       const fieldname = lines[i].name.substr(topic_name.length + 1, lines[i].name.length) //remove topic_name
  //       const fieldnames = fieldname.split('/')
  //       var data = message
  //       for (var j in fieldnames) {
  //         data = data[fieldnames[j]]
  //       }
  //       // console.log(data, Date.now())

  //       //array data
  //       if (lines[i].array > -1 && data.length > 0) { //todo dynamic change of data length
  //         for (j; j < data.length; j++) {
  //           const line_name = lines[i].name + '/' + j.toString()
  //           const line_type = lines[i].type
  //           this.addLine2Chart(line_name, line_type)
  //           lines.push({ //add lines for array component
  //             name: line_name,
  //             type: line_type,
  //             array: -1
  //           })
  //         }
  //         lines.splice(i, 1) //limove lines of source array
  //       } else {
  //         this.chartReference.chartInstance.data.datasets.forEach(function(dataset) {
  //           if (dataset['label'] === lines[i].name) {
  //             dataset.data.push({
  //               t: Date.now(), //message.header.stamp.secs// + message.header.stamp.nsecs*10e9,//
  //               y: data
  //             });
  //             this.chartReference.chartInstance.update({
  //               preservation: true
  //             });
  //             return
  //           }
  //         }, this);
  //         // this.chartReference.chartInstance.update()
  //       }
  //     }
  //   });

  // }
  // addLines(topic_name, topic_type) {
  //   const msg = this.state.msgList[topic_type]
  //   console.log('add Topic', topic_name, topic_type, msg)
  //   for (var i in msg.fieldtypes) {
  //     var field_type = msg.fieldtypes[i]
  //     const field_name = topic_name + '/' + msg.fieldnames[i]
  //     if (msg.fieldnames[i] !== 'header') {

  //       if (PLOTTABLE_MSGS.includes(field_type)) {
  //         //single msg
  //         if (msg.fieldarraylen[i] === -1) {
  //           this.addLine2Chart(field_name, field_type)
  //         } else {
  //           //array msg
  //           //not add line now since size is unknown until receive first msg.
  //           field_type += 'MultiArray'
  //         }
  //         this.lines.push({
  //           name: field_name,
  //           type: field_type,
  //           array: msg.fieldarraylen[i]
  //         })

  //       } else if (this.state.msgList[field_type]) {
  //         this.addLines(field_name, field_type)
  //       } else {
  //         console.log('not in the msgList', field_type)
  //       }

  //     }
  //   }
  // }
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
    // console.log(this.chartReference)
    console.log('addLine', line_name)
    // console.log(this.chartReference.props.data.datasets)
    // this.chartReference.props.data.datasets.push({
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
        // console.log('remove inside', datasets[i]['label'])
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
      // console.log(topic_name, this.topics)    
      for (i = 0; i < this.topics[topic_name].lines.length; i++) {
        if (this.topics[topic_name].lines[i] === line_name) {
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

  // openModal() {
  //   this.setState({modalIsOpen: true});
  // }
  // afterOpenModal() {
  //   this.subtitle.style.color = '#f00';
  // }
  // closeModal() {
  //   this.setState({modalIsOpen: false});
  // }

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
      }
    };
    
    const customStyles = {
      width: '90%',
      height: '90%',
      overflow: 'scroll',
    };
  
    return ( 
      <div>
        <div>
          <label> rosbridgeURL: </label> 
          <input type = "text" value = { this.state.rosbridgeUrl }
            onChange = { this.rosbridgeUrlChange.bind(this) } /> 
          <button onClick = { this.updateRosConnection.bind(this)}> 
            { this.state.ros.isConnected ? 'Disconnect' : 'Connect'} 
          </button> 
          <button onClick = { this.updateTopicList.bind(this)} >
            update topic list 
          </button> 
        </div>

        {/*
        <div className='lineEdit'>
          <Select value = { this.state.selectedTopic }
            onChange = { this.topicSelect.bind(this) }
            options = { this.state.selectOptions }
            className='lineEditSelect'
          /> 
          <button className='lineEditBtn' onClick = { this.addSelectedTopic.bind(this) } >
            add 
          </button> 
          <br/>
          <Select value = { this.state.selectedLine }
            onChange = { this.lineSelect.bind(this) }
            options = { this.chartReference ? this.chartReference.chartInstance.data.datasets : []}
            className='lineEditSelect'
          /> 
          <button className='lineEditBtn' onClick = { this.removeSelectedLine.bind(this) }> 
            remove 
          </button> 
          <br/>
        </div>
      */}

        <Line ref = { (reference) => this.chartReference = reference }
          data = { this.chartReference ? this.chartReference.chartInstance.data : data }
          options = { this.chartReference ? this.chartReference.chartInstance.options : options }
        />

        <Popup trigger={<button>edit</button>} 
                open={this.state.addLinesOpen}
                onOpen={()=>this.setState({addLinesOpen:true})}
                position="right center"
                modal
                contentStyle={customStyles}
                closeOnDocumentClick
                >
          <PopupContents topics={this.state.topicList} 
                           msgs={this.state.msgList} 
                           data={this.state.data}
                           updateSelectedLines={this.updateSelectedLines.bind(this)}
           />
        </Popup>

        {/*
        <button onClick={this.openModal}>Open Modal!!</button>
        <Modal
          // isOpen={this.state.modalIsOpen}
          // onAfterOpen={this.afterOpenModal}
          // onRequestClose={this.closeModal}
          style={customStyles}
          contentLabel="Example Modal"
        >
          <PopupContents topics={this.state.topicList} msgs={this.state.msgList} />
        </Modal>
        */}

      </div>
    );
  }
}


export default App;