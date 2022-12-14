import styles from "../styles/Home.module.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import { API, Auth, withSSRContext, graphqlOperation } from "aws-amplify";
import { listMessages } from "../src/graphql/queries";
import { createMessage } from "../src/graphql/mutations";
import { onCreateMessage } from "../src/graphql/subscriptions";
import React, { useEffect, useState } from "react";
import Message from "../components/Message";

export async function getServerSideProps({ req }) {
  // wrap the request in a withSSRContext to use Amplify functionality serverside.
  const SSR = withSSRContext({ req });

  try {
    // currentAuthenticatedUser() will throw an error if the user is not signed in.
    const user = await SSR.Auth.currentAuthenticatedUser();

    // If we make it passed the above line, that means the user is signed in.
    const response = await SSR.API.graphql({
      query: listMessages,
      // use authMode: AMAZON_COGNITO_USER_POOLS to make a request on the current user's behalf
      authMode: "AMAZON_COGNITO_USER_POOLS",
    });

    // return all the messages from the dynamoDB
    return {
      props: {
        messages: response.data.listMessages.items,
      },
    };
  } catch (error) {
    // We will end up here if there is no user signed in.
    // We'll just return a list of empty messages.
    return {
      props: {
        messages: [],
      },
    };
  }
}

function Home({ messages, signOut }) {
  // Sets the stateMessages value to be initialized with whatever messages we
  // returned from getServersideProps
  const [stateMessages, setStateMessages] = useState([...messages]);
  const [messageText, setMessageText] = useState("");

  // this code goes right beneath the line written just above ^^
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const amplifyUser = await Auth.currentAuthenticatedUser();
        console.log(amplifyUser);
        setUser(amplifyUser);
      } catch (err) {
        setUser(null);
      }
    };

    fetchUser();

    // Subscribe to creation of message
    const subscription = API.graphql(
      graphqlOperation(onCreateMessage)
    ).subscribe({
      next: ({ provider, value }) => {
        setStateMessages((stateMessages) => [
          ...stateMessages,
          value.data.onCreateMessage,
        ]);
      },
      error: (error) => console.warn(error),
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function getMessages() {
      try {
        const messagesReq = await API.graphql({
          query: listMessages,
          authMode: "AMAZON_COGNITO_USER_POOLS",
        });
        setStateMessages([...messagesReq.data.listMessages.items]);
      } catch (error) {
        console.error(error);
      }
    }
    getMessages();
  }, [user]);

  const handleSubmit = async (event) => {
    // Prevent the page from reloading
    event.preventDefault();

    // clear the textbox
    setMessageText("");

    const input = {
      // id is auto populated by AWS Amplify
      message: messageText, // the message content the user submitted (from state)
      owner: user.username, // this is the username of the current user
    };

    // Try make the mutation to graphql API
    try {
      // console.log(input);
      await API.graphql({
        authMode: "AMAZON_COGNITO_USER_POOLS",
        query: createMessage,
        variables: {
          input: input,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={styles.background}>
      <div className={styles.container}>
        <h1 className={styles.title}> AWS Amplify Realtime ChatApp</h1>

        <div className={styles.chatbox}>
          {stateMessages
            // sort messages oldest to newest client-side
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((message) => (
              // map each message into the message component with message as props
              <Message
                message={message}
                user={user}
                // isMe={user.username === message.owner}
                key={message.id}
              />
            ))}
        </div>
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.formBase}>
            <input
              type="text"
              id="message"
              name="message"
              autoFocus
              required
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Send a message..."
              className={styles.textBox}
            />
            <button style={{ marginLeft: "8px" }}>Send</button>
          </form>
        </div>
        <div className="signout">
          <button onClick={() => signOut()} className="btn">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
export default withAuthenticator(Home);
