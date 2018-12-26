import React from 'react';

const CharacterNode = props => {
  return (<div className='character' {...props.attributes}>
    {props.children}
  </div>)
}

export default CharacterNode;