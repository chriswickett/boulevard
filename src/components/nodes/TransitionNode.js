import React from 'react';

const TransitionNode = props => {
  return (<div className='transition' {...props.attributes}>
    {props.children}
  </div>)
}

export default TransitionNode;