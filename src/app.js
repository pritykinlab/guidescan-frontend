import React, {useState, useEffect} from 'react';
import * as R from 'ramda';

import Breadcrumb from 'react-bootstrap/Breadcrumb';
import Toast from 'react-bootstrap/Toast';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import './app.scss';
import packageInfo from '../package.json';
import {QueryForm} from './queryForm.js';
import {GrnaQueryForm} from './grnaQueryForm.js';
import {LibraryQueryForm} from './libraryQueryForm.js';
import {DownloadsPage} from './downloadsPage.js';
import {AboutPage} from './aboutPage';
import {ContactPage} from './contactPage';
import {getInfoSupported, submitQuery, submitGrnaQuery, submitLibraryQuery} from './jobs/rest';
import {JobPage} from './jobs/jobPage';

import {
  Routes,
  Route,
  Navigate,
  Link,
  useMatch,
  useNavigate,
} from 'react-router-dom';

function ActiveBreadcrumbItem(props) {
  const match = useMatch({
    path: props.path,
    exact: props.exact
  });

  const link = (
    !match
      ? <Breadcrumb.Item href={props.path}>{props.label}</Breadcrumb.Item>
      : <Breadcrumb.Item active>{props.label}</Breadcrumb.Item>
  );

  return link;
}

function CitationBox() {
  const box_style = {padding: "2em 2em 1em 2em", margin: "2em 0 2em 0"};
  return (
    <Container>
      <Card id="citationbox">
        <h4>Citation</h4>
        <hr/>
        <p style={{fontSize: "1.15em"}}>
          Henri Schmidt, Minsi Zhang, Haralambos Mourelatos, Francisco J Sanchez-Rivera, 
          Scott W Lowe, Andrea Ventura, Christina S Leslie, Yuri Pritykin (2022).
          <br/>

          Genome-wide CRISPR guide RNA design and specificity analysis with GuideScan2.
          <br/>

          <i>
            bioRxiv
          </i>&#44; https://doi.org/10.1101/2022.05.02.490368.  
        </p>
      </Card>
    </Container>
  );
}

function NavigationBar() {
  return (
    <Breadcrumb className="navbar">
      <ActiveBreadcrumbItem path="/" exact={true} label="gRNA Design" />
      <ActiveBreadcrumbItem path="/library" exact={true} label="Gene-targeting Library" />
      <ActiveBreadcrumbItem path="/grna" label="gRNA Sequence Search" />
      <ActiveBreadcrumbItem path="/about" label="About" />
      <ActiveBreadcrumbItem path="/downloads" label="Downloads" />
      <ActiveBreadcrumbItem path="/contact" label="Contact" />
    </Breadcrumb>
  );
}

function GuidescanLogo(props) {
  return (
    <a href="/">
      <img src="/img/logo.png"
           height={props.height}
           objectfit="contain"
           alt="logo"/>
    </a>
  );
}

function GuidescanJumbotron() {
  const padding_style = (p) => ({padding: p});
  const margin_style = (m) => ({margin: m});
  return (
    <Container>
      <Card id="jumbotron" className="bg-light">
        <Row>
          <Col >
            <GuidescanLogo height={106}/>
            <br/><br/>
            <h3>&nbsp;CRISPR guideRNA design and analysis</h3>
          </Col>
        </Row>
      </Card>
    </Container>
  );
}

class QuitableToast extends React.Component {
  constructor(props) {
    super(props);
    this.state = {closed: false};
    this.onClose = this.onClose.bind(this);
  }

  onClose() {
    this.setState({closed: true});
  }

  render() {
    return (
        <Toast
          className={this.props.className}
          show={this.props.show && !this.state.closed}
          onClose={this.onClose}
          animation="true"
          style={{
            position: 'absolute',
            bottom: '3em',
            left: '3em',
          }}
          >
          <Toast.Header>
            <strong className="mr-auto">GuideScan</strong>
          </Toast.Header>
          <Toast.Body>{this.props.text}</Toast.Body>
        </Toast>
    );
  }
}

const QueryState = {
  NOT_SUBMITTED: 1,
  SUCCESS: 2,
  FAILURE: 3,
};

function App() {
    const [webversion, setWebVersion] = useState("");
    const [cliversion, setCliVersion] = useState("");
    const [queryState, updateQueryState] = useState(QueryState.NOT_SUBMITTED);
    const navigate = useNavigate();

    useEffect(() => {
        getInfoSupported((response) => {
            setWebVersion(response.data["version"]);
            setCliVersion(response.data["cli-version"]);
        })
    }, []);

    function handleSuccessfulQuery(response) {
        updateQueryState(QueryState.SUCCESS);
        navigate('/job/' + response.data["job-id"]);
    }

    function handleFailedQuery(error) {
        updateQueryState(QueryState.FAILURE);
    }

    const submitCallback = (queryState) =>
        submitQuery(handleSuccessfulQuery, handleFailedQuery, queryState);

    const grnaSubmitCallback = (queryState) => 
        submitGrnaQuery(handleSuccessfulQuery, handleFailedQuery, queryState);

    const librarySubmitCallback = (queryState) => 
        submitLibraryQuery(handleSuccessfulQuery, handleFailedQuery, queryState);

    let successToast = (
      <QuitableToast
        show={queryState === QueryState.SUCCESS}
        text="Successfully submitted query."/>
    );

    let failureToast = (
      <QuitableToast
        show={queryState === QueryState.FAILURE}
        text="Failure to submit query."/>
    );

    return (
      <div className="App">
        <NavigationBar/>
        <GuidescanJumbotron/>
        <Routes>
          <Route exact path="/" element={<QueryForm handleSubmit={submitCallback}/>}/>
          <Route exact path="/library" element={<LibraryQueryForm handleSubmit={librarySubmitCallback}/>}/>
          <Route exact path="/grna" element={<GrnaQueryForm handleSubmit={grnaSubmitCallback}/>}/>
          <Route exact path="/about" element={<React.Fragment><AboutPage/><CitationBox/></React.Fragment>}/>
          <Route exact path="/contact" element={<ContactPage/>}/>
          <Route exact path="/downloads" element={<DownloadsPage/>}/>
          <Route exact path='/job/:id' element={<JobPage/>}/>
        </Routes>
        {successToast}
        {failureToast}
        <footer className="footer mt-auto py-3">
          <div className="container justify-content-center text-center">
            <span className="text-muted">Guidescan Frontend v{packageInfo.version}, Web v{webversion}, CLI v{cliversion}</span>
          </div>
        </footer>
      </div>
    );
}

export default App;
