import React from 'react';

const DialogueNode = props => {
  return (<div className='dialogue' {...props.attributes}>
    {props.children}
  </div>)
}

export default DialogueNode;