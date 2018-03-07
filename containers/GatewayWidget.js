import React, {Component} from 'react';
import _ from 'lodash';
import HarmonyAPI from '../utils/harmonyApi';
import ContainerHeader from '../components/ContainerHeader';
import CountTag from '../components/CountTag';
import TableView from '../components/TableView';
import GatewayEditForm from './GatewayEditForm';
import { Line } from 'rc-progress';


import styles from '../styles/widgetStyles';
import '../stylesheets/Pager.css';
import '../stylesheets/GatewayWidget.css';

import Alert from '../components/Alert';
import apiErrorHandler from "../utils/apiErrorHandler";

const urlFor = (applicationId) => {
    return `/api/1/applications/${applicationId}/gateways`;
};

const UPTIME_REQUIRED_FOR_ONLINE = 30000;
const UPTIME_REQUIRED_FOR_DELAYED = 120000;
const PAGE_SIZE = 10;

class GatewayWidget extends Component {
    constructor(props) {
        super(props);
        this.state = {
            harmonyApi: this.props.harmonyApi || new HarmonyAPI(),
            applicationName: this.props.applicationName || this.props.applicationId,
            gateways: null,
            gatewayId: null,
            gatewayCount: null,
            gatewayStatuses: {
                all: null,
                up: null,
                delayed: null,
                down: null
            },
            selectedGateways: null,
            gatewayList: null,
            selectedGateway: null,
            editOpen: false,
            deleting: null,
            alert: { },
            progress: null
        };
        this.refreshData = this.refreshData.bind(this);
        this.splitGatewaysOnUptime = this.splitGatewaysOnUptime.bind(this);
        this.fetchGatewayDetailsFor = this.fetchGatewayDetailsFor.bind(this);
        this.handleEditClicked = this.handleEditClicked.bind(this);
        this.tableRowExtraFieldRenderer = this.tableRowExtraFieldRenderer.bind(this);
        this.handleGatewaySaved = this.handleGatewaySaved.bind(this);
        this.handleFileUploaded = this.handleFileUploaded.bind(this);
    }

    /* setup functions */
    componentWillMount() {
        this.refreshData();
    }
    _requestOptions() {
        return {};
    }
    refreshData() {
        this.fetchIds().then(() => {
            if(this.state.selectedGateways !== null){
                this.fetchGatewayDetailsFor(this.state.gatewayStatuses[this.state.selectedGateways].map((gw) => {
                    return gw.id;
                }));
            }
        });
    }
    /* end setup */

    /* table functions */
    fetchGatewayDetailsFor(ids) {
        if(_.isEmpty(ids)){
            this.setState({gatewayList: []});
            return;
        }
        this.setState({alert: {level: 0, message: 'Fetching...'}});
        this.state.harmonyApi.post(urlFor(this.props.applicationId) + '/by_id', _.merge(this._requestOptions(), {
            ids: ids
        })).then((res) => {
            this.setState({gatewayList: res, alert: {}});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({gatewayList: [], alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }
    handleDeleteClicked(id){
        this.setState({
            deleting: id
        })
    }
    handleConfirmDeleteClicked(){
        this.state.harmonyApi.destroy(urlFor(this.props.applicationId) + `/${this.state.deleting}`).then(this.refreshData)
            .then(() => {
                this.setState({alert: 3, message: 'Deleted!'}, () => {
                    setTimeout(() => {

                    })
                });
            }).catch((er) => {
                const error = apiErrorHandler.fromResponse(er);
                this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}});
            });
    }
    tableRowExtraFieldRenderer(element){
        return(
            <span className="table-row-extra-fields">
                <a href={'.'} onClick={(e) => {e.preventDefault(); this.handleEditClicked(element.id)}}>
                    <div className="icon"><i className="fa fa-edit" /></div>
                </a>
                {this.state.deleting && this.state.deleting === element.id ? <a href={'.'} onClick={(e) => {e.preventDefault(); this.handleConfirmDeleteClicked()}}><span className="icon">Delete</span></a> : null}
                <a href={'.'} onClick={(e) => {e.preventDefault(); this.handleDeleteClicked(element.id)}}>
                    <div className="icon"><i className="fa fa-minus-circle" /></div>
                </a>
            </span>
        )
    }
    renderSelectedGateways() {
        if (this.state.selectedGateways === null) {
            return null;
        }
        if (this.state.gatewayList === null) {
            return <strong>Loading...</strong>
        }
        return (
            <div className="table-responsive">
                <TableView fields={['id', 'name', 'active', 'checkinFrequency']}
                           searchFields={['id', 'name']}
                           pageSize={PAGE_SIZE}
                           elements={this.state.gatewayList}
                           extraFieldRenderer={this.tableRowExtraFieldRenderer}
                />
            </div>
        )
    }
    /* end table */

    /* master count functions */
    fetchIds() {
        return this.state.harmonyApi.get(urlFor(this.props.applicationId), _.merge(this._requestOptions(), {
            fields: '["__key__"]'
        })).then((res) => {
            this.setState({gatewayIds: res}, this.splitGatewaysOnUptime);
            this.setState({gatewayCount: res.length});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({ gatewayIds: [],
                            gatewayCount: 0,
                            alert: {level: 2, message: `(${error.status}) ${error.message}`}},
                          this.splitGatewaysOnUptime);
        });
    }
    splitGatewaysOnUptime() {
        if (!this.state.gatewayIds) {
            return null;
        }
        const statuses = this.state.gatewayIds.reduce((statuses, gateway) => {
            statuses.all.push(gateway);
            if (!gateway.lastCheckin) {
                statuses.down.push(gateway);
                return statuses;
            }
            const timestamp = new Date(gateway.lastCheckin);
            const timediff = new Date() - timestamp;
            if (timediff < UPTIME_REQUIRED_FOR_ONLINE) {
                statuses.up.push(gateway);
            } else if (timediff < UPTIME_REQUIRED_FOR_DELAYED) {
                statuses.delayed.push(gateway);
            } else {
                statuses.down.push(gateway);
            }
            return statuses;
        }, {up: [], delayed: [], down: [], all: []});
        this.setState({gatewayStatuses: statuses});
    }
    handleCountClicked(countType) {
        if (this.state.selectedGateways === countType) {
            this.setState({selectedGateways: null, gatewayList: null});
        } else {
            this.setState({selectedGateways: countType, gatewayList: null}, () => {
                this.fetchGatewayDetailsFor(this.state.gatewayStatuses[countType].map((gw) => {
                    return gw.id;
                }));
            });
        }
    }
    renderMasterCount() {
        return (
            <div className="statistic d-flex align-items-center bg-white has-shadow" style={styles.marginTop}>
                <div className="icon bg-violet"><i className="fa fa-podcast fa-lg"/></div>

                <CountTag label={'Registered'} count={_.isNull(this.state.gatewayCount) ? 'Loading...' : this.state.gatewayCount}
                          style={null} className={null} icon={null} onClick={() => {this.handleCountClicked('all')}}
                          currentlySelected={this.state.selectedGateways === 'all'} />

                <CountTag label={'Online'} count={_.isNull(this.state.gatewayStatuses.up) ? 'Loading...' : this.state.gatewayStatuses.up.length}
                          style={styles.good} className={null} icon={'fa fa-check'} onClick={() => {this.handleCountClicked('up')}}
                          currentlySelected={this.state.selectedGateways === 'up'} />

                <CountTag label={'Delayed'} count={_.isNull(this.state.gatewayStatuses.delayed) ? 'Loading...' : this.state.gatewayStatuses.delayed.length}
                          style={_.isNull(this.state.gatewayStatuses.delayed) || this.state.gatewayStatuses.delayed.length === 0 ? null : styles.warning}
                          className={null} icon={'fa fa-question'} onClick={() => {this.handleCountClicked('delayed')}}
                          currentlySelected={this.state.selectedGateways === 'delayed'} />

                <CountTag label={'Offline'} count={_.isNull(this.state.gatewayStatuses.down) ? 'Loading...' : this.state.gatewayStatuses.down.length}
                          style={_.isNull(this.state.gatewayStatuses.down) || this.state.gatewayStatuses.down.length === 0 ? null : styles.alert}
                          className={null} icon={'fa fa-exclamation'} onClick={() => {this.handleCountClicked('down')}}
                          currentlySelected={this.state.selectedGateways === 'down'} />
            </div>
        );
    }
    /* end master count */


    handleGatewaySaved(gateway){
        this.refreshData();
        this.setState({alert: {}, editOpen: false, selectedGateway: null});
    }

    handleEditClicked(gwid){
        this.setState({editOpen: false, selectedGateway: null}, () => {
            this.setState({editOpen: true, selectedGateway: gwid ? this.state.gatewayList.filter((gw) => {return gw.id === gwid})[0] : {}});
        });
    }

    renderGatewayEditForm(){
        if(!this.state.editOpen) { return null;}
        return <GatewayEditForm gateway={this.state.selectedGateway}
                                applicationId={this.props.applicationId}
                                onSave={this.handleGatewaySaved}
                                cancelClicked={() => {this.setState({editOpen: false, selectedGateway: null})}}
                                harmonyApi={this.state.harmonyApi}
        />
    }

    renderAddButton(){
        return <span key="gatewayAdd" className="icon clickable">
            <a onClick={(e) => {e.preventDefault(); this.handleEditClicked(null)}}>
                <i className="fa fa-plus" />
            </a>
        </span>
    }

    bulkCreate(gateways){
        this.setState({progress: {current: 0, max: gateways.length}});
        let promises = gateways.map((gateway) => {
            return this.state.harmonyApi.post(urlFor(this.props.applicationId), gateway)
                .then((res) => {
                    const done = this.state.progress.current + 1;
                    this.setState({progress: {current: done, max: gateways.length}});
                })
                .catch((er) => {
                const error = apiErrorHandler.fromResponse(er);
                this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}})
            });
        });

        Promise.all(promises).then((results) => {
            this.setState({progress: null, alert: {level: 3, message: `Created ${results.length} gateways.`}}, () => {
                setTimeout(this.handleGatewaySaved, 1500);
            })
        });
    }

    handleFileUploaded(event){
        // const contents = FileReader.readAsText(event.target.files[0]);
        const reader = new FileReader();

        reader.onload = (e) => {
            const contents = e.target.result.split(`\n`).map((line) => {
               let [id, name, checkinFrequency] = line.split(',');
               checkinFrequency = parseInt(checkinFrequency);
               if(_.isNaN(checkinFrequency)){ checkinFrequency = 30 }
               return {id, name, checkinFrequency, active: true};
            });
            this.bulkCreate(contents);
        };
        reader.readAsText(event.target.files[0]);
    }

    renderUploadButton(){
        return(
            <span key="gatewayUpload" className="icon clickable">
                <input id="gatewayUploadButton" type="file" style={{display: 'none'}} onChange={this.handleFileUploaded}/>
                <label style={{marginBottom: 0}} htmlFor={"gatewayUploadButton"}><i className="fa fa-upload clickable" /></label>
            </span>
        );
    }

    renderProgressBar(){
        if(this.state.progress){
            return <Line className="statistic d-flex align-items-center bg-white has-shadow"
                         percent={this.state.progress.current / this.state.progress.max * 100}
                         strokeWidth="2"
                         strokeColor="green" />
        }
    }

    render() {
        let title;
        if(this.props.showApplicationHeader !== false){
            title = this.state.applicationName + this.props.applicationId !== false ? ` (${this.props.applicationId})` : null;
        } else {
            title = 'Gateways';
        }
        return (
            <div key={`gatewayWidgetFor:${this.props.applicationId}`} className={this.props.className} onClick={() => {if(this.state.deleting !== null){ this.setState({deleting: null})}}}>
                <ContainerHeader title={title}
                                 refreshClicked={this.refreshData}
                                 otherOperations={[this.renderUploadButton(), this.renderAddButton()]}
                />
                {!_.isEmpty(this.state.alert) ? <Alert level={this.state.alert.level} message={this.state.alert.message} /> : null}
                {this.renderProgressBar()}
                {this.renderMasterCount()}
                {this.renderSelectedGateways()}
                {this.renderGatewayEditForm()}
            </div>
        )
    }
}

export default GatewayWidget;