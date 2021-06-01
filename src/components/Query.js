import { Link } from 'react-router-dom'

import { useSelector, useDispatch } from 'react-redux';
import { increment } from '../actions';
import { decrement } from '../actions';

const Query = () => {
  const counter = useSelector(state => state.counter);
  const dispatch = useDispatch();
  return (
    <div>
      <h4>Query goes here</h4>
      <h4>Counter {counter}</h4>
      <button onClick={() => dispatch(increment(5))}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
      <hr/>
      <Link to='/'>Go Back</Link>
    </div>
  )
}

export default Query
