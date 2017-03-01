import React, { PropTypes } from 'react';
import _ from 'lodash';

import UserMessage from './UserMessage.jsx';
import SystemMessage from './SystemMessage.jsx';

const propTypes = {
  messages: PropTypes.array.isRequired,
  users: PropTypes.array.isRequired,
};

const MessageList = ({ messages, users }) => {
  let content = (
    <div className="no-items">
      <h3>No Messages availabe!</h3>
    </div>
  );
  const messageItems = [];
  messages.forEach(message => {
    if (message.author_id) {
      let targetUser = users.filter(user => user.id === message.author_id);
      if (targetUser.length > 0) {
        targetUser = _.first(targetUser);
        const messageItem = {
          pinned: message.pinned,
          content: message.content,
          created_at: message.created_at,
          displayName: targetUser.display_name,
          avatarUrl: targetUser.display_image,
        };
        messageItems.push(<SystemMessage key={message.id} message={messageItem} />);
      }
    }
    const messageItem = {
      content: message.content,
      created_at: message.created_at,
    };
    messageItems.push(<UserMessage key={message.id} message={messageItem} />);
  });

  if (messageItems.length > 0) {
    content = messageItems;
  }

  return (
    <div className="event-list">
      <ul>
        {content}
      </ul>
    </div>
  );
};

MessageList.propTypes = propTypes;
export default MessageList;
