import React from 'react';
import ReactDOM from 'react-dom';
import TopicCheckboxTree from './TopicCheckboxTree';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<TopicCheckboxTree />, div);
  ReactDOM.unmountComponentAtNode(div);
});
