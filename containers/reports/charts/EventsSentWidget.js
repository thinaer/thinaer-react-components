import React, { Component } from 'react';
import _ from 'lodash';
import HarmonyAPI from '../../../utils/harmonyApi';
import Select from 'react-select';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Area } from 'recharts';
import styles from '../../../styles/widgetStyles';
import Alert from '../../../components/Alert';
import apiErrorHandler from "../../../utils/apiErrorHandler";

const HOUR = 86400000/24;
const urlFor = (applicationId) => {
    return `/api/1/applications/${applicationId}/reports/events_triggered`
};

const NO_SUBTYPE_KEY = ' ';

const sumFor = (hash) => {
    return Object.keys(hash).reduce((sum, key) => {
        return sum + hash[key];
    }, 0);
};

class EventsSentWidget extends Component {
    constructor(props){
        super(props);
        this.state = {
            harmonyApi: this.props.harmonyApi || new HarmonyAPI(),
            resolution: this.props.initialResolution || '1h',
            timePeriod: this.props.initialTimePeriod || 86400000,
            breakoutOpen: this.props.initialBreakoutOpen || false,
            chartOpen: this.props.initialchartOpen || false,
            includeSubTypes: this.props.initialIncludeSubTypes || true,
            applicationName: this.props.applicationName || this.props.applicationId,
            overviewCount: null,
            breakoutCounts: null,
            chartCounts: null,
            alert: { }
        };
        this.onTimePeriodChanged = this.onTimePeriodChanged.bind(this);
        this.toggleBreakout = this.toggleBreakout.bind(this);
        this.toggleChart = this.toggleChart.bind(this);
        this._requestOptions = this._requestOptions.bind(this);
        this.refreshData = this.refreshData.bind(this);
    }

    componentWillMount(){
        this.fetchOverviewData();
        this.interval = setInterval(this.refreshData, 30000);
    }
    componentWillUnmount(){
        clearInterval(this.interval);
    }

    _requestOptions(){
        return {
            endTime: (new Date()).toISOString(),
            startTime: (new Date(new Date() - this.state.timePeriod)).toISOString(),
            resolution: this.state.resolution,
            fields: []
        };
    }

    fetchOverviewData(){
        ///api/1/applications/5766609847189504/reports/events_triggered?endTime=2018-02-22T12:00:00Z&startTime=2018-02-20T11:00:00Z&resolution=30m&fields=["eventType","subType"]
        this.state.harmonyApi.get(urlFor(this.props.applicationId), this._requestOptions()).then((res) => {
            const count = res.data.reduce((sum, element) => {
                return sum + element.requests
            }, 0);
            this.setState({overviewCount: count});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({overviewCount: 0, alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }

    fetchBreakoutData(){
        this.state.harmonyApi.get(urlFor(this.props.applicationId), _.merge(this._requestOptions(), {
            fields: '["eventType", "subType"]'
        })).then((res) => {
            const counts = res.data.reduce((counts, element) => {
                const type = element.eventType;
                const stype = element.subType === 'undefined' ? NO_SUBTYPE_KEY : element.subType;
                if(!counts[type]){ counts[type] = {}; }
                if(!counts[type][stype]) { counts[type][stype] = 0; }
                counts[type][stype] += element.requests;
                return counts;
            }, {});
            this.setState({breakoutCounts: counts});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({breakoutCounts: null, alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }

    fetchChartData(){
        this.state.harmonyApi.get(urlFor(this.props.applicationId), _.merge(this._requestOptions(), {
            fields: '["eventType", "subType"]'
        })).then((res) => {
            // group it such that it is an array of {timestamp, eventType:subType, eventType:subType}
            // then sort by timestamp
            let chartCounts = [];
            _.forOwn(res.data.reduce((counts, element) => {
                const time = new Date(element.time);
                const type = element.eventType;
                const stype = element.subType === 'undefined' ? NO_SUBTYPE_KEY : element.subType;
                if(!counts[time]){ counts[time] = {}; }
                const k = type + (stype === NO_SUBTYPE_KEY ? '' : `-${stype}`);
                counts[time][k] = element.requests;
                return counts;
            }, {}), (hsh, timestamp) => {
                chartCounts.push(_.merge(hsh, {timestamp: new Date(timestamp)}));
            });
            // transform it from hash to array
            this.setState({chartCounts: _.sortBy(chartCounts, 'timestamp')}, () => {
                console.log('counts', this.state.chartCounts)
            });
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({chartCounts: null, alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }


    onTimePeriodChanged(val){
        this.setState({timePeriod: val.value}, () => {
            this.refreshData();
        });
    }

    refreshData(){
        this.fetchOverviewData();
        if(this.state.breakoutOpen){ this.fetchBreakoutData(); }
        if(this.state.chartOpen){ this.fetchChartData(); }
    }

    toggleBreakout(){
        const newVal = !this.state.breakoutOpen;
        this.setState({breakoutOpen: newVal}, () => {
            if(newVal === true){
                this.fetchBreakoutData();
            }
        });
    }

    toggleChart(){
        const newVal = !this.state.chartOpen;
        this.setState({chartOpen: newVal}, () => {
            if(newVal === true){
                this.fetchChartData();
            }
        });
    }

    renderTimePeriodSelector(){
        const opts = [
            {value: HOUR, label: 'Last Hour'},
            {value: HOUR * 3, label: 'Last 3 Hours'},
            {value: HOUR * 6, label: 'Last 6 Hours'},
            {value: HOUR * 12, label: 'Last 12 Hours'},
            {value: HOUR * 24, label: 'Last Day'},
            {value: HOUR * 24 * 3, label: 'Last 3 Days'},
            {value: HOUR * 24 * 7, label: 'Last Week'},
        ];

        return <div className="dropdown">
                <Select options={opts}
                       style={styles.select}
                       value={this.state.timePeriod}
                       multi={false}
                       searchable={false}
                       clearable={false}
                       name={"Select Time Period"}
                       placeholder={"Select Time Period"}
                       onChange={this.onTimePeriodChanged}
                />
        </div>
    }

    renderHeaderTitle() {
        if (this.props.showApplicationHeader !== false) {
            return <h3 className="h4"
                       style={styles.fullWidth}>{this.state.applicationName} {this.props.showApplicationId !== false ? `(${this.props.applicationId})` : null}</h3>
        }
        return <h3 className="h4" style={styles.fullWidth}>Events Sent</h3>
    }

    renderHeader(){
        return (
            <div className="card-header d-flex align-items-center">
                {this.renderHeaderTitle()}
                {this.renderTimePeriodSelector()}
                <div style={styles.refreshButton} className="icon"><a onClick={(e) => {e.preventDefault(); this.refreshData()}}><i className="fa fa-refresh" /></a></div>
            </div>
        );
    }

    renderMasterCount(){
        return(
            <div className="statistic d-flex align-items-center bg-white has-shadow" style={styles.marginTop}>
                <div className="icon bg-orange"><i className="fa fa-paper-plane-o" /></div>
                <div className="text" style={styles.fullWidth}>
                    <strong>{_.isNull(this.state.overviewCount) ? 'Loading...' : this.state.overviewCount}</strong>
                    <br/>
                    <small>Events Transmitted</small>
                </div>
                <div className="text">
                    <button onClick={() => {this.toggleBreakout()}}><i className="icon-bars" /></button>
                </div> &nbsp;
                {/*<div className="text">*/}
                    {/*<button onClick={() => {this.toggleChart()}}><i className="icon-line-chart" /></button>*/}
                {/*</div>*/}
            </div>
        );
    }

    renderBreakoutElements(){
        if(_.isEmpty(this.state.breakoutCounts)){
            return <div>No data...</div>
        }
        const types = Object.keys(this.state.breakoutCounts).sort();
        return(
            types.reduce((elements, type) => {
                elements.push(
                    <div key={`${this.props.applicationId}:${type}`} style={styles.fullWidth}>
                        <div style={styles.fullWidth}>
                                <strong style={styles.fullWidth}>{type}</strong>
                                <strong style={styles.floatRight}>{sumFor(this.state.breakoutCounts[type])}</strong>
                        </div>
                        {Object.keys(this.state.breakoutCounts[type]).sort().map((subType) => {
                            if(subType === NO_SUBTYPE_KEY){ return null; }
                            return <div key={`${this.props.applicationId}:${type}:${subType}`} style={_.merge(styles.fullWidth, styles.indentLeft)}>
                                    &nbsp; <small style={_.merge(styles.fullWidth, styles.peripheral)}>{subType}</small>
                                    <span style={_.merge(styles.floatRight, styles.peripheral)}>{this.state.breakoutCounts[type][subType]}</span>
                            </div>
                        })}
                        {type !== types[types.length - 1] ? <hr /> : null}
                    </div>
                );

                return elements;
            }, [])
        )
    }

    renderBreakout(){
        if(this.state.breakoutOpen){
            return(
                <div className="statistic align-items-center bg-white has-shadow" style={styles.marginTop}>
                    {_.isNull(this.state.breakoutCounts) ? <strong>Loading...</strong> : this.renderBreakoutElements()}
                </div>
            )
        }
    }

    renderChartElements() {
        return(
            <ResponsiveContainer height="500px" width="100%">
                <AreaChart data={this.state.chartCounts}
                           margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip />
                    {/*<ReferenceLine x="Page C" stroke="green" label="Min PAGE" />*/}
                    {/*<ReferenceLine y={4000} label="Max" stroke="red" strokeDasharray="3 3" />*/}
                    {Object.keys(this.state.chartCounts[0]).map((key) => {
                        if(key === 'timestamp'){ return null; }
                        console.log('attaching', key)
                        return <Area type="monotone" key={`${this.props.applicationId}:chartline:${key}`} dataKey={key} stroke="#8884d8" fill="#8884d8" />
                    })}
                </AreaChart>
            </ResponsiveContainer>
        )
    }

    renderChart(){
        if(this.state.chartOpen){
            return (
                <div className="statistic align-items-center bg-white has-shadow" style={styles.marginTop}>
                    {/*(Need a resolution selector)*/}
                    {_.isNull(this.state.chartCounts) ? <strong>Loading...</strong> : this.renderChartElements()}
                </div>
            )
        }
    }

    renderFooter(){
        if(!this.props.footer){
            return <div style={styles.footer}><small>Powered By THINaër</small></div>
        }
        return this.props.footer;
    }

    render(){
        return(
            <div className={`${this.props.className}`}>
                {this.renderHeader()}
                {!_.isEmpty(this.state.alert) ? <Alert level={this.state.alert.level} message={this.state.alert.message} /> : null}
                {this.renderMasterCount()}
                {this.renderBreakout()}
                {/*{this.renderChart()}*/}
                {this.renderFooter()}
            </div>
        )
    }
}

export default EventsSentWidget;