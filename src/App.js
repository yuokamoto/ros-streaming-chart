import React, { Component } from 'react';
import { Line } from 'react-chartjs-2';
import 'chartjs-plugin-streaming';
import './App.css';

const ROSLIB = require("roslib");


class App extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
     rosbridge_url: 'ws://localhost:9090',
     data: {}
    };

    this.state.ros = new ROSLIB.Ros({
        url : this.state.rosbridge_url
     })

    this.state.ros.on('connection', function() {
      console.log('Connected to websocket server.');
    });

    this.state.ros.on('error', function(error) {
      console.log('Error connecting to websocket server: ', error);
    });

    this.state.ros.on('close', function() {
      console.log('Connection to websocket server closed.');
    });

    setInterval(() => {
        console.log(this.state.ros.isConnected)
        //todo 
        // add change image
    },
    1000);

    this.state.joint_state = new ROSLIB.Topic({
        ros : this.state.ros,
        name : '/joint_states',
        messageType : 'sensor_msgs/JointState'
    });
    this.state.joint_state.subscribe(message => {
        // console.log('Received message on : ' + message.position[0]);
        this.state.data['/joint_states/0'] = {
          'data': message.position[0],
          'time': Date.now()//message.header.stamp.secs// + message.header.stamp.nsecs*10e9
        }
    });

  }

  refresh(chart){
   // console.log('refresh')
   chart.data.datasets.forEach(function(dataset) {
      console.log(this.state.data['/joint_states/0']['data'], this.state.data['/joint_states/0']['time'])
      // console.log(this.state)
      dataset.data.push({
        x: this.state.data['/joint_states/0']['time'],//Date.now(),
        y: this.state.data['/joint_states/0']['data']//Math.random()
      });
    }, this);
  } 

  render() {
    // const onRefresh = (chart) => {this.refresh(chart)};
    const data = {
        datasets: [{
          label: 'Dataset 1',
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          fill: false,
          lineTension: 0,
          borderDash: [8, 4],
        }, 
        // {
        //   label: 'Dataset 2',
        //   borderColor: 'rgb(54, 162, 235)',
        //   backgroundColor: 'rgba(54, 162, 235, 0.5)',
        //   fill: false,
        // }
        ]
      };
    const options = {
        title: {
          display: true,
          text: 'Line chart (hotizontal scroll) sample'
        },
        scales: {
          xAxes: [{
            type: 'realtime',
            realtime: {
              // onRefresh:function(chart) {
              //   chart.data.datasets.forEach(function(dataset) {
              //     dataset.data.push({
              //       x: Date.now(),
              //       y: Math.random()
              //       // x: this.state.data['/joint_states/0']['time'],//Date.now(),
              //       // y: this.state.data['/joint_states/0']['data']//Math.random()
              //     });
              //   });
              // },
              // onRefresh: onRefresh, 
              // refresh: 100,
              // delay: 2000
            }
          }]
        },
        tooltips: {
          mode: 'nearest',
          intersect: false
        },
        hover: {
          mode: 'nearest',
          intersect: false
        }
      };
    return (
      <Line data={data} options={options}/>
    );
  }
}


export default App;