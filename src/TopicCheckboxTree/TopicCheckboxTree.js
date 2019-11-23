import React, {
  Component
} from 'react';
import Popup from "reactjs-popup";
import CheckboxTree from 'react-checkbox-tree';
import './TopicCheckboxTree.css';
import 'font-awesome/css/font-awesome.min.css'; 
import 'react-checkbox-tree/lib/react-checkbox-tree.css';

const PLOTTABLE_MSGS = [
  'bool',
  'uint8', 'uint16', 'uint32', 'uint64',
  'int16', 'int32', 'int64',
  'float32', 'float64'
]

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
}
class TopicCheckboxTree extends React.Component {
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

    this.onSubmit = this.onSubmit.bind(this)
    this.onArrayIndexPopupClose = this.onArrayIndexPopupClose.bind(this)
    this.onArrayIndexAdd = this.onArrayIndexAdd.bind(this)
  }

  addTopics() {
    const topics = this.props.topics.topics
    const types = this.props.topics.types
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
        if(children && children.length>0){
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
    if(!msg){
      return
    }
    var children = []
    for (var i in msg.fieldtypes) {
      var field_type = msg.fieldtypes[i]
      const field_name = topic_name + '/' + msg.fieldnames[i]
      if (msg.fieldnames[i] !== 'header') {
        if (PLOTTABLE_MSGS.includes(field_type)) {
          //single msg
          if (msg.fieldarraylen[i] === -1) {
          } else {
            //array msg
            //not add line now since size is unknown until receive first msg.
            field_type += 'MultiArray'
            showCheckbox = false
          }
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
  onSubmit(){
    this.props.onSubmit(this.state.data)
  }
  onClick(targetNode){
    var node = getNode(targetNode.value, this.state.data.source)  
    if(node.array>=0){
      this.selectedNode = node
      this.state.arrayIndex = 0
      this.setState({arrayIndexInputOpen: true });
    }
  }
  onCheck(checked, targetNode){
    this.state.data.selection = checked
    this.setState({data:this.state.data})
    console.log('check', targetNode, this.state.data.source)
  }
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
    return (
      <div className='popup'>
　      <button onClick={this.onSubmit}>submit</button>
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
                onClose={this.onArrayIndexPopupClose}
                >
                <form onSubmit={this.onArrayIndexAdd}>
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


export  {
  SelectionData,
  TopicCheckboxTree,
  getNode,
  selectChildrenFromSource,
  applyChangesInSource
}