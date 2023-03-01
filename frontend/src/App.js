import logo from './logo.svg';
import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
  useParams,
  useNavigate,
} from "react-router-dom";
import axios from 'axios';
import 'github-markdown-css/github-markdown-dark.css';
import useWebSocket from 'react-use-websocket';


const PAGE_URL = "http://localhost:4000"
async function urlLoader({ params }) {
  // console.log(params.mdUrl);
  console.log(params)
  const res = await axios.get(`${PAGE_URL}/page/${params['*']}`);
  // console.log(res);
  return res.data;
}

const socketUrl = "ws://localhost:4000/changes";
function MarkdownPage(params) {
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);
  const md = useLoaderData()
  const [ _html, setHtml ] = useState(md);
  const navigate = useNavigate()
  useEffect(() => {
    if (lastMessage !== null) {
      const {event, path} = JSON.parse(lastMessage.data);
      console.log('Detected change in', event, path);
      (async () => {
        const res = await axios.get(`${PAGE_URL}/page/${path}`);
        setHtml(res.data);
      })();
      // console.log(res);
      navigate(`/page/${path}`)
    }
  }, [lastMessage, navigate]);




  return <div style={{ minHeight: "100vh", height: "100%", padding: "10px" }} className={"markdown-body"} dangerouslySetInnerHTML={{ __html: _html }}></div>;
}

// Websocket
// const ws = new WebSocket();
// ws.addEventListener('message', function message(event) {
//   console.log('received %s', event.data)
// })

const router = createBrowserRouter([
  {
    path: "/page/*",
    loader: urlLoader,
    element: <MarkdownPage />
  }
])
function App() {
  return (
    <RouterProvider router={router} />
  );
}




export default App;
