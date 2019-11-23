import React from 'react';
import ReactDOM from 'react-dom';
import ROSBridgeConnection from './ROSBridgeConnection';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<ROSBridgeConnection />, div);
  ReactDOM.unmountComponentAtNode(div);
});
