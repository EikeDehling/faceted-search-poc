/**
 * Based on https://github.com/scotchfield/elasticsearch-react-example/
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Jumbotron, PageHeader, Grid, Row, Col, Panel, ListGroup, ListGroupItem } from 'react-bootstrap';
import elasticsearch from 'elasticsearch'


let client = new elasticsearch.Client({
	host: 'http://localhost:9200',
	log: 'trace',
	apiVersion: '2.4'
})


const App = React.createClass({
	getInitialState () {
		return {
			results: []
		}
	},

	handleChange ( event ) {
		client.search({
		    index: 'companies',
			//q: event.target.value
			body: {
			    query: {
                    match: {
                        organization_name: event.target.value
                    }
                }
			}
		}).then(function ( body ) {
			this.setState({ results: body.hits.hits })
		}.bind(this), function ( error ) {
			console.trace( error.message );
		});
	},

	nothing ( event ) {
	    // Do nothing
	},

	render () {
		return (
            <Grid>
                <Jumbotron className="text-center">
                    <h1>Elasticsearch faceted search PoC</h1>
                    <p>Just start typing in the search form to try it out. The query examples are
                    in the code, so look there for more details!</p>
                </Jumbotron>

                <Row>
                    <Col xs={3} md={3}>
                        <Panel header="Filters" bsStyle="primary">
                            <input type="text" onChange={ this.handleChange } placeholder="Enter query ..." />

                            <p>&nbsp;</p>

                            <Panel header="Filter by Country">
                                <ListGroup fill>
                                    <ListGroupItem onClick={this.nothing}>Netherlands</ListGroupItem>
                                    <ListGroupItem onClick={this.nothing}>Belgium</ListGroupItem>
                                    <ListGroupItem onClick={this.nothing}>Luxemburg</ListGroupItem>
                                </ListGroup>
                            </Panel>

                            <Panel header="Filter by # Employees">
                                <ListGroup fill>
                                    <ListGroupItem onClick={this.nothing}>0-5</ListGroupItem>
                                    <ListGroupItem onClick={this.nothing}>5-10</ListGroupItem>
                                    <ListGroupItem onClick={this.nothing}>10-100</ListGroupItem>
                                    <ListGroupItem onClick={this.nothing}>&gt; 100</ListGroupItem>
                                </ListGroup>
                            </Panel>
                        </Panel>
                    </Col>

                    <Col xs={9} md={9}>
                        <Panel header="Results" bsStyle="primary">
                            { this.state.results.length == 0 ?
                                    <p>No results found</p>
                                :
                                    <ul>
                                        { this.state.results.map((result) => {
                                            return <li key={ result._id }>{ result._source.organization_name }</li> }) }
                                    </ul>
                                }
                        </Panel>
                    </Col>
                </Row>
            </Grid>
		)
	}
})


ReactDOM.render(
	<App />,
	document.getElementById('react')
)
