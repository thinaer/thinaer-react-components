import React, { Component } from 'react';
import '../stylesheets/GatewayWidget.css';
import _ from 'lodash';
import SearchableTableHeader from './SearchableTableHeader';
import v from 'voca';
import Pager from 'react-pager';

const prettyValueFor = (value) => {
    if(value === true){
        return 'Yes';
    } else if(value === false){
        return 'No';
    } else {
        return value;
    }
};

class TableView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            searchBy: this.props.searchFields ? this.props.searchFields[0] : null,
            sortBy: this.props.fields[0],
            sortDirection: 1,
            searchValue: null,
            totalPages: 0,
            currentPage: 0,
            visiblePages: 5,
            elements: this.props.elements
        };
        this.setSearchBy = this.setSearchBy.bind(this);
        this.updateSearch = this.updateSearch.bind(this);
        this.handleSearchTextEntered = this.handleSearchTextEntered.bind(this);
        this.handlePageChanged = this.handlePageChanged.bind(this);
    }

    componentDidMount(){
        this.updateSearch();
    }

    componentWillReceiveProps(props){
        this.setState({elements: props.elements});
    }

    setSearchBy(by){
        this.setState({searchBy: by}, this.updateSearch);
    }
    handleSearchTextEntered(value){
        this.setState({searchValue: value}, this.updateSearch);
    }

    updateSearch(){
        this.setState({
            elements: this.props.elements.filter((el) => {
                if(this.state.searchValue === null){ return true; }
                return el[this.state.searchBy].toUpperCase().indexOf(this.state.searchValue.toUpperCase()) >= 0;
            })
        }, () => {
            this.setState({totalPages: this.state.elements.length / this.props.pageSize, currentPage: 0});
        });
    }

    renderSearch(){
        return <SearchableTableHeader initialSearchBy={this.props.searchFields[0]}
                                      searchFields={this.props.searchFields}
                                      searchByChanged={this.setSearchBy}
                                      onSearchUpdated={this.handleSearchTextEntered}
        />
    }

    currentPage(){
        const sliced = _.orderBy(this.state.elements, [this.state.sortBy], [this.state.sortDirection === 1 ? 'asc' : 'desc']).slice(this.props.pageSize * this.state.currentPage, this.props.pageSize * (this.state.currentPage + 1));
        return sliced;
    }

    renderPager(){
        if(this.state.elements.length <= this.props.pageSize){ return null; }
        return <Pager
            total={this.state.totalPages}
            current={this.state.currentPage}
            visiblePages={this.state.visiblePages}
            titles={{first: 'First', last: 'Last'}}
            className="pagination-sm pull-right"
            onPageChanged={this.handlePageChanged}
        />
    }

    handlePageChanged(page){
        this.setState({currentPage: page});
    }

    setSearch(field){
        this.setState({
            sortBy: field,
            sortDirection: this.state.sortBy === field ? this.state.sortDirection * -1 : 1
        })
    }

    render(){
        return(
            <div className="table-responsive">
                {!_.isEmpty(this.props.searchFields) ? this.renderSearch() : null}
                <table className="table table-striped table-sm">
                    <thead>
                    <tr>
                        {this.props.fields.map((field) => {
                            return <th key={`header:${field}`}><a href={'.'} onClick={(e) => {e.preventDefault(); this.setSearch(field)}}>{v.titleCase(field)}</a></th>
                        })}
                        {this.props.extraFieldRenderer ? <th>&nbsp;</th> : null}
                    </tr>
                    </thead>
                    <tbody>
                    {this.currentPage().map((element) => {
                        return <tr key={`body:${element.id}`}>
                            {this.props.fields.map((field) => {
                                if(field === this.props.fields[0]){
                                    return <th key={`body:${element.id}:${field}`} scope={'row'}>{prettyValueFor(element[field])}</th>
                                } else {
                                    return <td key={`body:${element.id}:${field}`}>{prettyValueFor(element[field])}</td>
                                }
                            })}
                            {this.props.extraFieldRenderer ? <td>{this.props.extraFieldRenderer(element)}</td> : null}
                        </tr>
                    })}
                    </tbody>
                </table>
                {this.renderPager()}
            </div>
        )
    }
}

export default TableView;