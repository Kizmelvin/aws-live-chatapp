import React, { useState } from "react";
import styles from "../styles/Message.module.css";

export default function Message({ message, user }) {
  if (user) {
    return (
      <div
        className={
          user.username === message.owner
            ? styles.sentMessageContainer
            : styles.receivedMessageContainer
        }
      >
        <p className={styles.senderText}>{message.owner}</p>
        <div
          className={
            user.username === message.owner
              ? styles.sentMessage
              : styles.receivedMessage
          }
        >
          <p>{message.message}</p>
        </div>
      </div>
    );
  } else {
    return <p>Loading...</p>;
  }
}
