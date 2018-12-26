import React from 'react';

const ActionNode = props => {
  return (<div className='action' {...props.attributes}>
    {props.children}
  </div>)
}

export default ActionNode;