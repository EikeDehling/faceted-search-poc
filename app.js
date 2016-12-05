/**
 * Based on https://github.com/scotchfield/elasticsearch-react-example/
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Jumbotron, PageHeader, Grid, Row, Col, Panel } from 'react-bootstrap';
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
		    index: 'rss',
			q: event.target.value
		}).then(function ( body ) {
			this.setState({ results: body.hits.hits })
		}.bind(this), function ( error ) {
			console.trace( error.message );
		});
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
                        <Panel header={"Search"}>
                            <input type="text" onChange={ this.handleChange } placeholder="Enter query ..." />
                        </Panel>
                    </Col>

                    <Col xs={9} md={9}>
                        <Panel header={"Results"}>
                            { this.state.results.length == 0 ?
                                    <p>No results found</p>
                                :
                                    <ul>
                                        { this.state.results.map((result) => {
                                            return <li key={ result._id }>{ result._source.title }</li> }) }
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
