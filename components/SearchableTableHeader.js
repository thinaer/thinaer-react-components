import React, { Component } from 'react';
import '../stylesheets/GatewayWidget.css';

class SearchableTableHeader extends Component {
    constructor(props){
        super(props);
        this.state = {
            searchBy: this.props.initialSearchBy.toUpperCase(),
            searchValue: ''
        };
        this.handleSearchTextEntered = this.handleSearchTextEntered.bind(this);
        this.setSearchBy = this.setSearchBy.bind(this);
    }

    setSearchBy(type){
        this.setState({searchBy: type}, () => {
            this.props.searchByChanged(type);
        });
    }

    handleSearchTextEntered(e){
        this.setState({searchValue: e.target.value}, () => {this.props.onSearchUpdated(this.state.searchValue)});
    }

    render(){
        return(
            <div className="input-group">
                <div className="input-group-prepend">
                    <button data-toggle="dropdown" type="button" className="btn btn-outline-secondary dropdown-toggle">Search
                        By {this.state.searchBy.toUpperCase()}<span className="caret" /></button>
                    <div className="dropdown-menu">
                        {this.props.searchFields.map((field) => {
                            return <a key={`searchlist:${field}`} href={'.'} className="dropdown-item" onClick={(e) => {
                                e.preventDefault();
                                this.setSearchBy(field)
                            }}>{field.toUpperCase()}</a>
                        })}
                    </div>
                </div>
                <input type="text" className="form-control" onKeyUp={this.handleSearchTextEntered}/>
            </div>
        )
    }
}

export default SearchableTableHeader;