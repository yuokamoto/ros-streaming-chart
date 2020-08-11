## ROS Streaming chart
![demo](ros-streaming-chart.gif)

Web browser tool to visualize time series data from ROS by using roslibjs and chart.js

### Run
##### 1. Install and run app
```
yarn install
yarn start
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.
##### 2. Visualize
1. Run rosbridge-server in the computer which publishing ROS data. 
2. Open browser and input rosbridge url.
3. Add data
3-1. Open data selection from `edit` btn at bottom
3-2. Check data you want to visalize.
*if the topic is not in the checklist, close modal and press `update topic list` at top
*The array type data do not have checkbox. You can add array index by click the topic name.

### Contact
Yu Okamoto(yuokamoto1988@gmail.com)
