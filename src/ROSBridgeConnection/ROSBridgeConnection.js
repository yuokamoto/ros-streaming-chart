import React, {
  Component
} from 'react';
import './ROSBridgeConnection.css';

const ROSLIB = require("roslib");

class ROSBridgeConnection extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ros: null,
      rosbridgeUrl: 'ws://localhost:9090',
      topicList: {'topics': [], 'types': []},
      msgList: {},
    };

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

    this.state.ros.on('error', (error) => {
      console.log('Error connecting to websocket server: ', error);
      this.setRosInstance()
    });

    this.state.ros.on('close', () => {
      console.log('Connection to websocket server closed.');
      this.setState({
        state: this.state
      });
      this.setRosInstance()
    });

    setInterval(() => {
      //todo 
      // add change image
    },
    1000);    

    this.rosbridgeUrlChange = this.rosbridgeUrlChange.bind(this)
    this.updateRosConnection = this.updateRosConnection.bind(this)
    this.updateTopicList = this.updateTopicList.bind(this)
  }
  setRosInstance(){
    if(this.props.getRosInstance){
      this.props.getRosInstance(this.state.ros, this.state.msgList, this.state.topicList)
    }
  }
  updateRosConnection() {
    if(this.state.ros){
      if (this.state.ros.isConnected) {
        this.state.ros.close()
      } else {
        this.state.ros.connect(this.state.rosbridgeUrl)
      }
    }
  }

  updateTopicList() {
    this.state.ros.getTopics((topics) => {
      console.log("Getting topics...");

      topics.types.forEach(function(msg_name) {
        if (!(msg_name in this.state.msgList)) {
          this.getMsgInfo(msg_name)
        }
      }, this)

      this.setState({topicList: topics})
      this.setRosInstance()
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
      console.log("Getting msginfo... ", msg_name);

      var temp = this.state.msgList
      result.typedefs.forEach((data) => {
        // console.log(data.type, data)
        // this.state.msgList[data.type] = data
        temp[data.type] = data
      }, this)

      this.setState({
        msgList: temp
      })

    });
  }

  rosbridgeUrlChange(event) {
    this.setState({
      rosbridgeUrl: event.target.value
    });
  }

  render() {
  
    return ( 
        <div>
          <label> rosbridgeURL: </label> 
          <input type = "text" style={{width:'20em'}} value = { this.state.rosbridgeUrl }
            onChange = { this.rosbridgeUrlChange } /> 
          <button onClick = { this.updateRosConnection }> 
            { (this.state.ros && this.state.ros.isConnected) ? 'Disconnect' : 'Connect'} 
          </button> 
          <button onClick = { this.updateTopicList } >
            update topic list 
          </button> 
        </div>
    );
  }
}


export default ROSBridgeConnection;