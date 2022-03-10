import {AsyncStorage} from 'react-native';
import {createStore, combineReducers, compose, applyMiddleware} from 'redux';
import thunk from 'redux-thunk';
import devTools from 'remote-redux-devtools';
import {persistStore, autoRehydrate, purgeStoredState} from 'redux-persist';
import createFilter from 'redux-persist-transform-filter';
import logger from 'redux-logger';

import {reducer as dataReducer} from './data/reducer';
import {reducer as servicesReducer} from './services/reducer';
import * as persistActionCreators from './services/persist/actions';

const appReducer = combineReducers({
  services: servicesReducer,
  data: dataReducer,
});

const enhancer = compose(applyMiddleware(thunk), devTools());

const store = createStore(
  appReducer,
  enhancer,
  autoRehydrate(),
  applyMiddleware(logger),
);

const config = {
  storage: AsyncStorage,
};

persistStore(store, config, () => {
  store.dispatch(persistActionCreators.update({isHydrated: true}));
  console.log('State persisted!');
  //  console.log('State persisted!', store.getState());
});

export default store;
