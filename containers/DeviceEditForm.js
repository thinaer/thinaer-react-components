import React, { Component } from 'react';
import '../stylesheets/GatewayWidget.css';
import _ from 'lodash';
import Alert from '../components/Alert';
import apiErrorHandler from '../utils/apiErrorHandler';

const urlFor = (applicationId, deviceId) => {
    let str = `/api/1/applications/${applicationId}/devices`;
    if(deviceId){
        str += `/${deviceId}`;
    }
    return str;
};

class GatewayEditForm extends Component {
    constructor(props){
        super(props);
        this.state = {
            id: props.device.id || undefined,
            active: _.isNull(props.device.active) ? true : props.device.active,
            name: props.device.name || undefined,
            checkinFrequency: props.device.checkinFrequency || 30,
            harmonyApi: props.harmonyApi,
            alert: { }
        };
        this.handleSubmitClicked = this.handleSubmitClicked.bind(this);
        this.handleActiveClicked = this.handleActiveClicked.bind(this);
    }

    handleSubmitClicked(event){
        event.preventDefault();
        this.setState({alert: {level: 0, message: 'Saving...'}});
        if(!this.props.device.id){
            // it's new
            this.state.harmonyApi.post(urlFor(this.props.applicationId), {
                id: this.state.id,
                name: this.state.name,
                checkinFrequency: this.state.checkinFrequency,
                active: this.state.active
            }).then((res) => {
                this.setState({alert: {level: 3, message: 'Saved!'}});
                setTimeout(() => {
                    this.props.onSave(res);
                }, 1500);
            }).catch((er) => {
                const error = apiErrorHandler.fromResponse(er);
                this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}});
            });
        } else {
            this.state.harmonyApi.put(urlFor(this.props.applicationId, this.state.id), {
                active: this.state.active,
                name: this.state.name,
                checkinFrequency: this.state.checkinFrequency
            }).then((res) => {
                this.setState({alert: {level: 3, message: 'Saved!'}});
                setTimeout(() => {
                    this.props.onSave(res);
                }, 1500);
            }).catch((er) => {
                const error = apiErrorHandler.fromResponse(er);
                this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}});
            });
        }
    }

    handleValueChanged(valueType){
        return ((event) => {
            let st = {};
            st[valueType] = event.target.value;
            this.setState(st);
        });
    }

    handleActiveClicked(event){
        this.setState({active: !this.state.active});
    }

    render(){
        return(
            <div>
                {!_.isEmpty(this.state.alert) ? <Alert level={this.state.alert.level} message={this.state.alert.message} /> : null}
                <div className="d-flex align-items-center bg-white has-shadow">
                    <form className="form-inline device-edit">
                        <div className="form-group">
                            <label htmlFor="inputId" className="sr-only">Name</label>
                            <input id="inputId" type="text"
                                   placeholder="ID"
                                   className="mr-3 form-control"
                                   defaultValue={this.state.id} disabled={!_.isEmpty(this.props.device.id)}
                                   onChange={this.handleValueChanged('id')}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="name" className="sr-only">Username</label>
                            <input id="name" type="text"
                                   placeholder="Name"
                                   className="mr-3 form-control"
                                   defaultValue={this.state.name}
                                   onChange={this.handleValueChanged('name')}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="checkinFrequency" className="sr-only">Username</label>
                            <input id="checkinFrequency" type="number" min={1} max={600}
                                   placeholder="Checkin Frequency"
                                   className="mr-3 form-control"
                                   defaultValue={this.state.checkinFrequency}
                                   onChange={this.handleValueChanged('checkinFrequency')}
                            />
                        </div>
                        <div className="form-group i-checks">
                            <label htmlFor="active">Active</label>
                            <input id="active" type="checkbox"
                                   defaultValue={this.state.active}
                                   checked={this.state.active}
                                   className="checkbox-template"
                                   onChange={this.handleActiveClicked}
                            />
                        </div>
                        <div className="form-group">
                            <button type="submit" className="btn btn-primary" onClick={this.handleSubmitClicked}>Submit</button>
                            <button type="submit" className="btn" onClick={(e) => {e.preventDefault(); this.props.cancelClicked()}}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }
}

export default GatewayEditForm;