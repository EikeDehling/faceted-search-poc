/**
 * Based on https://github.com/scotchfield/elasticsearch-react-example/
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Jumbotron, PageHeader, Grid, Row, Col, Panel, ListGroup, ListGroupItem, Button } from 'react-bootstrap';
import elasticsearch from 'elasticsearch'


let client = new elasticsearch.Client({
	host: 'http://localhost:9200',
	log: 'trace',
	apiVersion: '2.4'
})


const App = React.createClass({
	getInitialState() {
		return {
			results: [],
			total_count: 0,

			query: "",
			country: "",
			activity: "",

			countries: [ "NL", "UK", "BE" ],
			activities: [ 1, 2, 3 ]
		}
	},

	doSearch(event) {
	    let filters = [
	        { match: { organization_name: this.state.query } }
	    ]

	    if (this.state.country !== "") {
	        filters.push({ terms: { country_code: [ this.state.country ] } })
	    }

	    if (this.state.activity !== "") {
            filters.push({ terms: { activity_code: [ this.state.activity ] } })
        }

		client.search({
		    index: 'companies',
			body: {
			    query: {
			        bool: {
			            must: filters
			        }
                }
			}
		}).then(function ( body ) {
			this.setState({
			    results: body.hits.hits,
			    total_count: body.hits.total
			})
		}.bind(this), function ( error ) {
			console.trace( error.message );
		});
	},

	updateQuery(event) {
	    this.setState({query: event.target.value})
	},

	updateCountry(country_code) {
        this.setState({country: country_code}, function done() { this.doSearch() })
    },

    updateActivity(activity_code) {
        this.setState({activity: activity_code}, function done() { this.doSearch() })
    },

	nothing(event) {
	    // Do nothing
	},

	render() {
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
                            <input type="text" onChange={this.updateQuery} placeholder="Enter query ..." size="16" />
                            <Button bsStyle="primary" onClick={this.doSearch}>Search</Button>

                            <p>&nbsp;</p>

                            <Panel header="Filter by Country">
                                <ListGroup fill>
                                    { this.state.countries.map((ctry) => {
                                        return <ListGroupItem onClick={this.updateCountry.bind(this, ctry)}>{ctry}</ListGroupItem> }) }

                                    <ListGroupItem onClick={this.updateCountry.bind(this, "")}>(Clear)</ListGroupItem>
                                </ListGroup>
                            </Panel>

                            <Panel header="Filter by Activity Code">
                                <ListGroup fill>
                                    { this.state.activities.map((act) => {
                                        return <ListGroupItem onClick={this.updateActivity.bind(this, act)}>{act}</ListGroupItem> }) }

                                    <ListGroupItem onClick={this.updateActivity.bind(this, "")}>(Clear)</ListGroupItem>
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
                        <Results total_count={this.state.total_count} results={this.state.results} />
                    </Col>
                </Row>
            </Grid>
		)
	}
})


const Results = React.createClass({
    render() {
		return (<Panel header="Results" bsStyle="primary">
                    <p>Total results: { this.props.total_count }</p>

                    { this.props.total_count == 0 ?
                            <p>No results found</p>
                        :
                            <ul>
                                { this.props.results.map((result) => {
                                    return <li key={ result._id }>{ result._source.organization_name }</li> }) }
                            </ul>
                        }
                </Panel>)
	}
})


ReactDOM.render(
	<App />,
	document.getElementById('react')
)
