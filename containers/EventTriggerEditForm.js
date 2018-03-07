import React, { Component } from 'react';
import '../stylesheets/GatewayWidget.css';

const urlFor = (applicationId, eventTriggerId) => {
    let str = `/api/1/applications/${applicationId}/event_triggers`;
    if(eventTriggerId){
        str += `/${eventTriggerId}`;
    }
    return str;
};

const EVENT_TYPES = [
    'PingEvent',
    'MovementEvent',
    'EnterEvent',
    'ExitEvent',
    'PeripheralEvent'
];

class EventTriggerEditForm extends Component {
    constructor(props){
        super(props);
        this.state = {
            endpoint : props.eventTrigger.endpoint || undefined,
            event : props.eventTrigger.event || this.availableEventTriggers()[0],
            headers : props.eventTrigger.headers || undefined,
            id : props.eventTrigger.id || undefined,
            harmonyApi: props.harmonyApi
        };
        this.handleSubmitClicked = this.handleSubmitClicked.bind(this);
    }

    availableEventTriggers(){
        return EVENT_TYPES.filter((type) => {
            return this.props.eventTriggersInUse.indexOf(type) < 0
        }).concat(this.props.eventTrigger.event).filter(e => e !== undefined);
    }

    handleSubmitClicked(event){
        event.preventDefault();
        if(!this.props.eventTrigger.id){
            // it's new
            this.state.harmonyApi.post(urlFor(this.props.applicationId), {
                id: this.state.event,
                event: this.state.event,
                headers: this.state.headers,
                endpoint: this.state.endpoint
            }).then((res) => {
                this.props.onSave(res);
            })
        } else {
            this.state.harmonyApi.put(urlFor(this.props.applicationId, this.state.id), {
                id: this.state.event,
                event: this.state.event,
                headers: this.state.headers,
                endpoint: this.state.endpoint
            }).then((res) => {
                this.props.onSave(res);
            })
        }
    }

    handleValueChanged(valueType){
        return ((event) => {
            let st = {};
            st[valueType] = event.target.value;
            this.setState(st);
        });
    }


    setEvent(event){
        this.setState({event: event});
    }

    render(){
        if(this.availableEventTriggers().length === 0){
            return <div className="d-flex align-items-center bg-white has-shadow"><h3 className="h4">All triggers have been defined</h3></div>
        }
        return(
            <div className="d-flex align-items-center bg-white has-shadow">
                <form className="form-inline gateway-edit">
                    <div className="form-group" style={{width: '100%'}}>
                        <div className="input-group-prepend">
                            <button data-toggle="dropdown"
                                    type="button"
                                    disabled={this.props.eventTrigger.event !== undefined}
                                    className="btn btn-outline-secondary dropdown-toggle">
                                Event: {this.state.event.split('Event')[0].toUpperCase()}<span className="caret" /></button>
                            <div className="dropdown-menu">
                                {this.availableEventTriggers().map((field) => {
                                    return <a key={`eventSelector:${field}`} href={'.'} className="dropdown-item" onClick={(e) => {
                                        e.preventDefault();
                                        this.setEvent(field)
                                    }}>{field.split('Event')[0].toUpperCase()}</a>
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{width: '100%'}}>
                        <label htmlFor="inputEndpoint" className="sr-only">Name</label>
                        <input id="inputEndpoint" type="text" style={{width: '100%'}}
                               placeholder="Endpoint"
                               className="mr-3 form-control"
                               defaultValue={this.state.endpoint}
                               onChange={this.handleValueChanged('endpoint')}
                        />
                    </div>
                    <div className="form-group" style={{width: '100%'}}>
                        <label htmlFor="inputHeaders" className="sr-only">Name</label>
                        <input id="inputHeaders" type="text" style={{width: '100%'}}
                               placeholder="Headers"
                               className="mr-3 form-control"
                               defaultValue={JSON.stringify(this.state.headers)}
                               onChange={this.handleValueChanged('headers')}
                        />
                    </div>
                    <div className="form-group">
                        <button type="submit" className="btn btn-primary" onClick={this.handleSubmitClicked}>Submit</button>
                        <button type="submit" className="btn" onClick={(e) => {e.preventDefault(); this.props.cancelClicked()}}>Cancel</button>
                    </div>
                </form>
            </div>
        )
    }
}

export default EventTriggerEditForm;