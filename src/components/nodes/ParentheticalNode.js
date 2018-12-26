import React from 'react';

const Parenthetical = props => {
  return (<div className='parenthetical' {...props.attributes}>
    {props.children}
  </div>)
}

export default Parenthetical;