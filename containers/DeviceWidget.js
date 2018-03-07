import React, {Component} from 'react';
import _ from 'lodash';
import HarmonyAPI from '../utils/harmonyApi';
import ContainerHeader from '../components/ContainerHeader';
import CountTag from '../components/CountTag';
import TableView from '../components/TableView';
import DeviceEditForm from './DeviceEditForm';
import { Line } from 'rc-progress';

import '../stylesheets/Pager.css';
import '../stylesheets/GatewayWidget.css';
import styles from "../styles/widgetStyles";

import Alert from '../components/Alert';
import apiErrorHandler from "../utils/apiErrorHandler";

const urlFor = (applicationId) => {
    return `/api/1/applications/${applicationId}/devices`;
};

const UPTIME_REQUIRED_FOR_ONLINE = 30000;
const UPTIME_REQUIRED_FOR_DELAYED = 120000;
const PAGE_SIZE = 10;

class DeviceWidget extends Component {
    constructor(props){
        super(props);
        this.state = {
            harmonyApi: this.props.harmonyApi || new HarmonyAPI(),
            devices: null,
            deviceId: null,
            deviceCount: null,
            deviceStatuses: {
                all: null,
                up: null,
                delayed: null,
                down: null
            },
            selectedDevices: null,
            deviceList: null,
            selectedDevice: null,
            editOpen: false,
            deleting: null,
            alert: { },
            progress: null
        };
        this.refreshData = this.refreshData.bind(this);
        this.splitDevicesOnUptime = this.splitDevicesOnUptime.bind(this);
        this.fetchDeviceDetailsFor = this.fetchDeviceDetailsFor.bind(this);
        this.handleEditClicked = this.handleEditClicked.bind(this);
        this.tableRowExtraFieldRenderer = this.tableRowExtraFieldRenderer.bind(this);
        this.handleDeviceSaved = this.handleDeviceSaved.bind(this);
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
            if(this.state.selectedDevices !== null){
                this.fetchDeviceDetailsFor(this.state.deviceStatuses[this.state.selectedDevices].map((de) => {
                    return de.id;
                }));
            }
        });
    }
    /* end setup */

    /* table functions */
    fetchDeviceDetailsFor(ids) {
        if(_.isEmpty(ids)){
            this.setState({deviceList: []});
            return;
        }
        this.state.harmonyApi.post(urlFor(this.props.applicationId) + '/by_id', _.merge(this._requestOptions(), {
            ids: ids
        })).then((res) => {
            this.setState({deviceList: res});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({deviceList: [], alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }
    handleDeleteClicked(id){
        this.setState({
            deleting: id
        })
    }
    handleConfirmDeleteClicked(){
        this.state.harmonyApi.destroy(urlFor(this.props.applicationId) + `/${this.state.deleting}`)
            .then(this.refreshData)
            .catch((er) => {
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
    renderSelectedDevices() {
        if (this.state.selectedDevices === null) {
            return null;
        }
        if (this.state.deviceList === null) {
            return <strong>Loading...</strong>
        }
        return (
            <div className="table-responsive">
                <TableView fields={['id', 'name', 'active', 'checkinFrequency']}
                           searchFields={['id', 'name']}
                           pageSize={PAGE_SIZE}
                           elements={this.state.deviceList}
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
            this.setState({deviceIds: res}, this.splitDevicesOnUptime);
            this.setState({deviceCount: res.length});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({ deviceIds: [],
                    deviceCount: 0,
                    alert: {level: 2, message: `(${error.status}) ${error.message}`}},
                this.splitDevicesOnUptime);
        });
    }
    splitDevicesOnUptime() {
        if (!this.state.deviceIds) {
            return null;
        }
        const statuses = this.state.deviceIds.reduce((statuses, device) => {
            statuses.all.push(device);
            if (!device.lastCheckin) {
                statuses.down.push(device);
                return statuses;
            }
            const timestamp = new Date(device.lastCheckin);
            const timediff = new Date() - timestamp;
            if (timediff < UPTIME_REQUIRED_FOR_ONLINE) {
                statuses.up.push(device);
            } else if (timediff < UPTIME_REQUIRED_FOR_DELAYED) {
                statuses.delayed.push(device);
            } else {
                statuses.down.push(device);
            }
            return statuses;
        }, {up: [], delayed: [], down: [], all: []});
        this.setState({deviceStatuses: statuses});
    }
    handleCountClicked(countType) {
        if (this.state.selectedDevices === countType) {
            this.setState({selectedDevices: null, deviceList: null});
        } else {
            this.setState({selectedDevices: countType, deviceList: null}, () => {
                this.fetchDeviceDetailsFor(this.state.deviceStatuses[countType].map((gw) => {
                    return gw.id;
                }));
            });
        }
    }
    renderMasterCount() {
        return (
            <div className="statistic d-flex align-items-center bg-white has-shadow" style={styles.marginTop}>
                <div className="icon bg-green"><i className="fa fa-bluetooth fa-lg"/></div>

                <CountTag label={'Registered'} count={_.isNull(this.state.deviceCount) ? 'Loading...' : this.state.deviceCount}
                          style={null} className={null} icon={null} onClick={() => {this.handleCountClicked('all')}}
                          currentlySelected={this.state.selectedDevices === 'all'} />

                <CountTag label={'Online'} count={_.isNull(this.state.deviceStatuses.up) ? 'Loading...' : this.state.deviceStatuses.up.length}
                          style={styles.good} className={null} icon={'fa fa-check'} onClick={() => {this.handleCountClicked('up')}}
                          currentlySelected={this.state.selectedDevices === 'up'} />

                <CountTag label={'Delayed'} count={_.isNull(this.state.deviceStatuses.delayed) ? 'Loading...' : this.state.deviceStatuses.delayed.length}
                          style={_.isNull(this.state.deviceStatuses.delayed) || this.state.deviceStatuses.delayed.length === 0 ? null : styles.warning}
                          className={null} icon={'fa fa-question'} onClick={() => {this.handleCountClicked('delayed')}}
                          currentlySelected={this.state.selectedDevices === 'delayed'} />

                <CountTag label={'Offline'} count={_.isNull(this.state.deviceStatuses.down) ? 'Loading...' : this.state.deviceStatuses.down.length}
                          style={_.isNull(this.state.deviceStatuses.down) || this.state.deviceStatuses.down.length === 0 ? null : styles.alert}
                          className={null} icon={'fa fa-exclamation'} onClick={() => {this.handleCountClicked('down')}}
                          currentlySelected={this.state.selectedDevices === 'down'} />
            </div>
        );
    }
    /* end master count */

    handleDeviceSaved(device){
        this.refreshData();
        this.setState({alert: {}, editOpen: false, selectedDevice: null});
    }

    handleEditClicked(gwid){
        this.setState({editOpen: false, selectedDevice: null}, () => {
            this.setState({editOpen: true, selectedDevice: gwid ? this.state.deviceList.filter((gw) => {return gw.id === gwid})[0] : {}});
        });
    }

    renderDeviceEditForm(){
        if(!this.state.editOpen) { return null;}
        return <DeviceEditForm device={this.state.selectedDevice}
                                applicationId={this.props.applicationId}
                                onSave={this.handleDeviceSaved}
                                cancelClicked={() => {this.setState({editOpen: false, selectedDevice: null})}}
                                harmonyApi={this.state.harmonyApi}
        />
    }

    renderAddButton(){
        return <div key="deviceAdd" className="icon clickable"><a onClick={(e) => {e.preventDefault(); this.handleEditClicked(null)}}><i className="fa fa-plus" /></a></div>
    }

    bulkCreate(devices){
        this.setState({progress: {current: 0, max: devices.length}});
        let promises = devices.map((device) => {
            return this.state.harmonyApi.post(urlFor(this.props.applicationId), device)
                .then((res) => {
                    const done = this.state.progress.current + 1;
                    this.setState({progress: {current: done, max: devices.length}});
                })
                .catch((er) => {
                    const error = apiErrorHandler.fromResponse(er);
                    this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}})
                });
        });

        Promise.all(promises).then((results) => {
            this.setState({progress: null, alert: {level: 3, message: `Created ${results.length} devices.`}}, () => {
                setTimeout(this.handleDeviceSaved, 1500);
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
            <span key="deviceUpload" className="icon clickable">
                <input id="deviceUploadButton" type="file" style={{display: 'none'}} onChange={this.handleFileUploaded}/>
                <label style={{marginBottom: 0}} htmlFor={"deviceUploadButton"}><i className="fa fa-upload clickable" /></label>
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

    render(){
        let title;
        if(this.props.showApplicationHeader !== false){
            title = this.state.applicationName + this.props.applicationId !== false ? ` (${this.props.applicationId})` : null;
        } else {
            title = 'Devices';
        }
        return(
            <div key={`deviceWidgetFor:${this.props.applicationId}`} className={this.props.className} onClick={() => {if(this.state.deleting !== null){ this.setState({deleting: null})}}}>
                <ContainerHeader title={title}
                                 refreshClicked={this.refreshData}
                                 otherOperations={[this.renderUploadButton(), this.renderAddButton()]}
                />
                {!_.isEmpty(this.state.alert) ? <Alert level={this.state.alert.level} message={this.state.alert.message} /> : null}
                {this.renderProgressBar()}
                {this.renderMasterCount()}
                {this.renderSelectedDevices()}
                {this.renderDeviceEditForm()}
            </div>

        )
    }
}

export default DeviceWidget;