import React from 'react';
import ReactDOM from 'react-dom';
import { Jumbotron, PageHeader, Grid, Row, Col, Panel, ListGroup, ListGroupItem, Button } from 'react-bootstrap';
import Autocomplete from 'react-autocomplete';
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

			city: "",
			city_suggestions: [],

			country: "",
			activity: "",
			year: { from: "0", to: "9999" },

			countries: [],
			activities: [],
			years: []
		}
	},

	componentDidMount() {
	    this.doSearch()
	},

	doSearch(event) {
	    let filters = []

	    if (this.state.year.from !== "0" || this.state.year.to !== "9999") {
	        filters.push({ range: { incorporation_date: { gte: this.state.year.from, lte: this.state.year.to, format: 'yyyy'}}})
	    }

	    if (this.state.city !== "") {
	        filters.push({ match: { city: this.state.city }})
        }

	    if (this.state.country !== "") {
	        filters.push({ terms: { country_code: [ this.state.country ] } })
	    }

	    if (this.state.activity !== "") {
            filters.push({ terms: { activity_code: [ this.state.activity ] } })
        }

        /**
         * Search-type=count ; requestCache=true ; this is to allow caching of the results
         * Unfortunately elastic only cache totals & aggs, not the hits itself. So if we'd
         * search for hits also, the query will not get cached!
         *
         * Note the aggregations are the "expensive" part! We simply do a second, cheap search
         * query that only fetches top results...
         */
		client.search({
		    index: 'companies',
		    requestCache: true,
		    searchType: 'count',
			body: {
			    query: {
			        bool: {
			            must: filters
			        }
                },
                aggs: {
                    activities: {
                        terms: {
                            field: 'activity_code'
                        }
                    },
                    countries: {
                        terms: {
                            field: 'country_code'
                        }
                    },
                    years: {
                        date_range: {
                            field: 'incorporation_date',
                            format: 'yyyy',
                            ranges: [
                                {               to: "1950" },
                                { from: "1950", to: "1975" },
                                { from: "1975", to: "1990" },
                                { from: "1990", to: "2000" },
                                { from: "2000", to: "2005" },
                                { from: "2005", to: "2010" },
                                { from: "2010", to: "2015" },
                                { from: "2015"             }
                            ]
                        }
                    }
                }
			}
		}).then(function ( body ) {
			this.setState({
			    total_count: body.hits.total,
			    activities: body.aggregations.activities.buckets
			        .map((entry) => { return { name: entry.key, count: entry.doc_count } })
			        .filter((entry) => { return entry.name !== "" }),
                countries: body.aggregations.countries.buckets
                    .map((bucket) => { return { name: bucket.key, count: bucket.doc_count } })
                    .filter((entry) => { return entry.name !== "" }),
                years: body.aggregations.years.buckets
                    .map((bucket) => { return { from: bucket.from_as_string, to: bucket.to_as_string, display: bucket.key, count: bucket.doc_count } })
                    .filter((entry) => { return entry.name !== "" }),
			})
		}.bind(this));

        /**
         * Second search to retrieve top results ; this is not cache unfortunately
         */
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
        		}.bind(this));
	},

	doSuggest(value) {
	    client.suggest({
	        index: 'companies',
	        body: {
	            city: {
	                text: value,
                    completion: {
                      field: 'city_suggest'
                    }
	            }
	        }
	    }).then(function success(body) {
	        debugger;

	        this.setState({
	           city_suggestions: body.city[0].options.map((sug) => { return sug.text })
	        });
	    }.bind(this));
	},

	updateCountry(country_code) {
        this.setState({country: country_code}, function done() { this.doSearch() })
    },

    updateActivity(activity_code) {
        this.setState({activity: activity_code}, function done() { this.doSearch() })
    },

    updateYear(from, to) {
        this.setState({year: {from: from, to: to}}, function done() { this.doSearch() })
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
                            <Autocomplete
                                  value={this.state.city}
                                  inputProps={{placeholder: 'Enter city...'}}
                                  items={this.state.city_suggestions}
                                  getItemValue={(item) => item}
                                  onSelect={(value, item) => {
                                    // Set the input field value to only the selected item, execute search
                                    this.setState({ city: item, city_suggestions: [ item ] },
                                        function cb() { this.doSearch() })
                                  }}
                                  onChange={(event, value) => {
                                    // Update input field value, fetch suggestions
                                    this.setState({ city: value },
                                        function cb() { this.doSuggest(value) })
                                  }}
                                  renderItem={(item, isHighlighted, style) => (
                                    <div className={isHighlighted ? 'highlighted' : 'unhighlighted'} id={item}>{item}</div>
                                  )}
                                />

                            <p>&nbsp;</p>

                            <Panel header="Filter by Country" collapsible defaultExpanded={true}>
                                <ListGroup fill>
                                    { this.state.countries.map((ctry) => {
                                        return <ListGroupItem onClick={this.updateCountry.bind(this, ctry.name)}>{ctry.name} ({ctry.count})</ListGroupItem> }) }

                                    <ListGroupItem onClick={this.updateCountry.bind(this, "")}>(Clear)</ListGroupItem>
                                </ListGroup>
                            </Panel>

                            <Panel header="Filter by Year" collapsible defaultExpanded={true}>
                                <ListGroup fill>
                                    { this.state.years.map((entry) => {
                                        return <ListGroupItem onClick={this.updateYear.bind(this, entry.from, entry.to)}>{entry.display} ({entry.count})</ListGroupItem> }) }

                                    <ListGroupItem onClick={this.updateYear.bind(this, "0", "9999")}>(Clear)</ListGroupItem>
                                </ListGroup>
                            </Panel>

                            <Panel header="Filter by Activity Code" collapsible defaultExpanded={true}>
                                <ListGroup fill>
                                    { this.state.activities.map((act) => {
                                        return <ListGroupItem onClick={this.updateActivity.bind(this, act.name)}>{act.name} ({act.count})</ListGroupItem> }) }

                                    <ListGroupItem onClick={this.updateActivity.bind(this, "")}>(Clear)</ListGroupItem>
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
