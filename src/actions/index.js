export const increment = (number_multiply) => {
  return {
    type: 'INCREMENT',
    payload: number_multiply
  };
};

export const decrement = () => {
  return {
    type: 'DECREMENT'
  };
};

export const signIn = () => {
  return {
    type: 'SIGN_IN'
  };
};
