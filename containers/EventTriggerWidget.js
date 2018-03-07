import React, {Component} from 'react';
import _ from 'lodash';
import HarmonyAPI from '../utils/harmonyApi';
import ContainerHeader from '../components/ContainerHeader';
import CountTag from '../components/CountTag';
import TableView from '../components/TableView';
import EventTriggerEditForm from './EventTriggerEditForm';

import styles from '../styles/widgetStyles';
import '../stylesheets/Pager.css';
import '../stylesheets/GatewayWidget.css';
import Alert from '../components/Alert';
import apiErrorHandler from "../utils/apiErrorHandler";

const urlFor = (applicationId) => {
    return `/api/1/applications/${applicationId}/event_triggers`;
};

const PAGE_SIZE = 10;

class EventTriggerWidget extends Component {
    constructor(props) {
        super(props);
        this.state = {
            harmonyApi: this.props.harmonyApi || new HarmonyAPI(),
            applicationName: this.props.applicationName || this.props.applicationId,
            eventTriggerIds: null,
            eventTriggers: null,
            eventTriggerCount: null,
            eventTriggerStatuses: {
                all: null
            },
            selectedEventTriggers: null,
            eventTriggerList: null,
            selectedEventTrigger: null,
            editOpen: false,
            deleting: null,
            alert: { }
        };
        this.refreshData = this.refreshData.bind(this);
        this.handleEditClicked = this.handleEditClicked.bind(this);
        this.tableRowExtraFieldRenderer = this.tableRowExtraFieldRenderer.bind(this);
        this.handleDeleteClicked = this.handleDeleteClicked.bind(this);
        this.handleConfirmDeleteClicked = this.handleConfirmDeleteClicked.bind(this);
        this.handleEventTriggerSaved = this.handleEventTriggerSaved.bind(this);
    }

    componentWillMount() {
        this.refreshData();
    }

    _requestOptions() {
        return {};
    }

    refreshData() {
        this.fetchIds().then(() => {
            if (this.state.selectedEventTriggers !== null) {
                this.fetchEventTriggerDetailsFor(this.state.eventTriggerStatuses[this.state.selectedEventTriggers].map((gw) => {
                    return gw.id;
                }));
            }
        });
    }

    fetchIds() {
        return this.state.harmonyApi.get(urlFor(this.props.applicationId), _.merge(this._requestOptions(), {
            fields: '["__key__"]'
        })).then((res) => {
            this.setState({eventTriggerCount: res.length, eventTriggerIds: res, eventTriggerStatuses: {all: res}});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({eventTriggerIds: [], eventTriggerCount: 0, alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }

    fetchEventTriggerDetailsFor(ids) {
        if (_.isEmpty(ids)) {
            this.setState({eventTriggerList: []});
            return;
        }
        this.state.harmonyApi.post(urlFor(this.props.applicationId) + '/by_id', _.merge(this._requestOptions(), {
            ids: ids
        })).then((res) => {
            this.setState({eventTriggerList: res});
        }).catch((er) => {
            const error = apiErrorHandler.fromResponse(er);
            this.setState({eventTriggerList: [], alert: {level: 2, message: `(${error.status}) ${error.message}`}});
        });
    }

    handlePageChanged(page) {
        this.setState({currentPage: page});
    }

    handleDeleteClicked(id) {
        this.setState({
            deleting: id
        })
    }

    handleConfirmDeleteClicked() {
        this.state.harmonyApi.destroy(urlFor(this.props.applicationId) + `/${this.state.deleting}`)
            .then(this.refreshData)
            .then(() => {
                this.setState({alert: 3, message: 'Deleted!'});
            }).catch((er) => {
                const error = apiErrorHandler.fromResponse(er);
                this.setState({alert: {level: 2, message: `(${error.status}) ${error.message}`}});
            });
    }

    tableRowExtraFieldRenderer(element) {
        return (
            <span className="table-row-extra-fields">
                <a href={'.'} onClick={(e) => {
                    e.preventDefault();
                    this.handleEditClicked(element.id)
                }}>
                    <div className="icon"><i className="fa fa-edit"/></div>
                </a>
                {this.state.deleting && this.state.deleting === element.id ? <a href={'.'} onClick={(e) => {
                    e.preventDefault();
                    this.handleConfirmDeleteClicked()
                }}><span className="icon">Delete</span></a> : null}
                <a href={'.'} onClick={(e) => {
                    e.preventDefault();
                    this.handleDeleteClicked(element.id)
                }}>
                    <div className="icon"><i className="fa fa-minus-circle"/></div>
                </a>
            </span>
        )
    }

    handleEditClicked(etid) {
        this.setState({editOpen: false, selectedEventTrigger: null}, () => {
            this.setState({
                editOpen: true, selectedEventTrigger: etid ? this.state.eventTriggerList.filter((gw) => {
                    return gw.id === etid
                })[0] : {}
            });
        });
    }

    renderAddButton() {
        return <div key="eventTriggerAdd" className="icon clickable"><a onClick={(e) => {
            e.preventDefault();
            this.handleEditClicked(null)
        }}><i className="fa fa-plus"/></a></div>
    }

    handleCountClicked(countType) {
        if (this.state.selectedEventTriggers === countType) {
            this.setState({selectedEventTriggers: null, eventTriggerList: null});
        } else {
            this.setState({selectedEventTriggers: countType, eventTriggerList: null}, () => {
                this.fetchEventTriggerDetailsFor(this.state.eventTriggerStatuses[countType].map((gw) => {
                    return gw.id;
                }));
            });
        }
    }

    renderSelectedEventTriggers() {
        if (this.state.selectedEventTriggers === null) {
            return null;
        }
        if (this.state.eventTriggerList === null) {
            return <strong>Loading...</strong>
        }
        return (
            <div className="table-responsive">
                <TableView fields={['event']}
                           searchFields={['event']}
                           pageSize={PAGE_SIZE}
                           elements={this.state.eventTriggerList}
                           extraFieldRenderer={this.tableRowExtraFieldRenderer}
                />
            </div>
        )
    }

    renderMasterCount() {
        return (
            <div className="statistic d-flex align-items-center bg-white has-shadow" style={styles.marginTop}>
                <div className="icon bg-blue"><i className="fa fa-list-alt fa-lg"/></div>
                <CountTag label={'Configured'}
                          count={_.isNull(this.state.eventTriggerCount) ? 'Loading...' : this.state.eventTriggerCount}
                          onClick={() => {
                              this.handleCountClicked('all')
                          }}
                          currentlySelected={this.state.selectedEventTriggers === 'all'}/>
            </div>
        )
    }

    handleEventTriggerSaved(eventTrigger) {
        this.refreshData();
        this.setState({editOpen: false, selectedEventTrigger: null});
    }

    renderEventTriggerEditForm() {
        if (!this.state.editOpen) {
            return null;
        }
        return <EventTriggerEditForm eventTrigger={this.state.selectedEventTrigger}
                                     applicationId={this.props.applicationId}
                                     onSave={this.handleEventTriggerSaved}
                                     cancelClicked={() => {
                                         this.setState({editOpen: false, selectedEventTrigger: null})
                                     }}
                                     harmonyApi={this.state.harmonyApi}
                                     eventTriggersInUse={this.state.eventTriggerIds.map((et) => {
                                         return et.id
                                     })}
        />

    }

    render() {
        let title;
        if (this.props.showApplicationHeader !== false) {
            title = this.state.applicationName + this.props.applicationId !== false ? ` (${this.props.applicationId})` : null;
        } else {
            title = 'Event Triggers';
        }
        return (
            <div key={`eventTriggerWidgetFor:${this.props.applicationId}`} className={this.props.className}
                 onClick={() => {
                     if (this.state.deleting !== null) {
                         this.setState({deleting: null})
                     }
                 }}>
                <ContainerHeader title={title}
                                 refreshClicked={this.refreshData}
                                 otherOperations={[this.renderAddButton()]}
                />
                {!_.isEmpty(this.state.alert) ? <Alert level={this.state.alert.level} message={this.state.alert.message} /> : null}
                {this.renderMasterCount()}
                {this.renderSelectedEventTriggers()}
                {this.renderEventTriggerEditForm()}
            </div>
        )
    }
}

export default EventTriggerWidget;