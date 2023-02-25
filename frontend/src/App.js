import logo from './logo.svg';
import './App.css';
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
  useParams,
} from "react-router-dom";
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import remarkToc from 'remark-toc'
import 'github-markdown-css/github-markdown-dark.css';


const PAGE_URL = "http://localhost:8764"
async function urlLoader({ params }) {
  // console.log(params.mdUrl);
  const res = await axios.get(`${PAGE_URL}/${params.mdUrl}`);
  // console.log(res);
  return res.data;
}


function MarkdownPage(params) {
  const md = useLoaderData()
  return <div style={{height: "100vh", padding: "10px"}} className={"markdown-body"}><ReactMarkdown className={"markdown-body"} remarkPlugins={[remarkToc]}>{md}</ReactMarkdown></div>;
}

// Websocket
const ws = new WebSocket("ws://localhost:8765");
ws.addEventListener('message', function message(event) {
  console.log('received %s', event.data)
})

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>

    )
  },
  {
    path: "/page/:mdUrl",
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
