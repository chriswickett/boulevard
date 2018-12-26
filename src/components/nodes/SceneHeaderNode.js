import React from 'react';

const DialogueNode = props => {
  return (<div className='scene-header' {...props.attributes}>
    {props.children}
  </div>)
}

export default DialogueNode;