import React from 'react';
import ReactDOM from 'react-dom';
import ROSStreamingChart from './ROSStreamingChart';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<ROSStreamingChart />, div);
  ReactDOM.unmountComponentAtNode(div);
});
