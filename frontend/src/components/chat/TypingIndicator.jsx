const TypingIndicator = ({ users }) => {
  if (!users || users.length === 0) return null;

  let text;
  if (users.length === 1) {
    text = `${users[0]} is typing...`;
  } else if (users.length === 2) {
    text = `${users[0]} and ${users[1]} are typing...`;
  } else {
    text = "Several people are typing...";
  }

  return <div className="typing-indicator">{text}</div>;
};

export default TypingIndicator;
