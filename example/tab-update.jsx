import React from 'react';
import ReactDOM from 'react-dom';
import {DockLayout} from '../lib';

const Context = React.createContext();

class Demo extends React.Component {

  state = {ctx: 0};
  addCtx = () => {
    this.setState({ctx: this.state.ctx + 1})
  };

  defaultLayout = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [{
            id: 'id1', title: 'consumer', content: (
              <Context.Consumer>
                {(value) => (
                  <div>
                    <p>React Context is the easiest way to update children tab.</p>
                    Current value is: <b>{value}</b>
                  </div>
                )}
              </Context.Consumer>
            ),
            // cached: true,
            // cacheContext: Context  // if cached = true, cacheContext is needed to pass the context to cache
          }],
        },
        {
          tabs: [{
            id: 'id2', title: 'add count', content: (
              <div>
                <p>Click here to change context.</p>
                <button onClick={this.addCtx}>Click to Add Value</button>
              </div>
            )
          }],
        }
      ]
    }
  };

  render() {
    return (
      <Context.Provider value={this.state.ctx}>
        <DockLayout defaultLayout={this.defaultLayout}
                    style={{position: 'absolute', left: 10, top: 10, right: 10, bottom: 10}}/>
      </Context.Provider>

    );
  }
}

ReactDOM.render(<Demo/>, document.getElementById('app'));