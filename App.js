import React from 'react';
import {StackNavigator, createStackNavigator} from 'react-navigation';
import {
  StyleSheet,
  View,
  AsyncStorage,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {Provider} from 'react-redux';
import {Root, Container, Toast} from 'native-base';


// Importing custom made packages
import store from './store';
import * as session from './services/session';
import * as sessionActions from './services/session/actions';
import * as routeHistoryActions from './services/routeHistory/actions';

/*
 * Keeping all the screens at the beggining of the file
 * Two types of screens:
 * Unprotected: Can be accessible by anyone (no authentication needed)
 * Protected: Can be accessible only by authenticate users
 **/

// Loading screen
import Loading from './screens/Main/Loading';

// Unprotected screens
import Main from './screens/Main';
import Login from './screens/Main/Login';
import Register from './screens/Main/Register';
import ResetPassword from './screens/Main/ResetPassword';
import Terms from './screens/Main/Terms';

// Security layer
import TwoFA from './screens/Main/Login/TwoFA';
import Pincode from './screens/Protected/Pincode';

// Protected screens
import Protected from './screens/Protected';
import Profile from './screens/Protected/Profile';
import ProfileInformation from './screens/Protected/Profile/ProfileInformation';
import ChangePassword from './screens/Protected/Profile/ChangePassword';
import Exchange from './screens/Protected/Exchange';
import Dashboard from './screens/Protected/Exchange/Dashboard';
import Markets from './screens/Protected/Exchange/Markets-New';
import Orders from './screens/Protected/Exchange/Orders';
import Trade from './screens/Protected/Exchange/Trade';
import TradeChart from './screens/Protected/Exchange/TradeChart';
import Wallet from './screens/Protected/Exchange/Wallet';

// Declaring the main style
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const PublicArea = createStackNavigator(
  {
    // Public area
    // Main: {screen: Main},
    Login: {screen: Login},
    Register: {screen: Register},
    ResetPassword: {screen: ResetPassword},
    Terms: {screen: Terms},


  },
  {
    headerMode: 'none',
    navigationOptions: {
      headerVisible: false,
    },
  },
);

const ProtectedArea = createStackNavigator(
  {
    // Protected area
    Dashboard: {screen: Dashboard},
    Exchange: {screen: Exchange},
    Orders: {screen: Orders},
    Protected: {screen: Protected},
    Markets: {screen: Markets},

    Profile: {screen: Profile},
    ProfileInformation: {screen: ProfileInformation},
    ChangePassword: {screen: ChangePassword},

    Trade: {screen: Trade},
    TradeChart: {screen: TradeChart},
    Wallet: {screen: Wallet},
  }, {
    headerMode: 'none',
    navigationOptions: {
      headerVisible: false,
    },
  },
);

class App extends React.Component {
  constructor() {
    super();

    this.state = {
      loading: true, // (true) => showing loading screen, (false) => hiding loading screen
      public: true, // (true) => showing the public area, when user is not authentiacted, (false) => showing the protected area, user is authetniacted
      isLogged: false, // (true) => the user is logged in, (false) => the user is not logged in
      twofa: false, // (true) => showing the 2FA screen, (false) => hiding the 2FA screen, 2FA is either verified or not enabled
      checkedAutoLogin: false, // (true) => on startup, autologin is tirggered, (false) => autologin is not triggered, wwaiting for autologin
      enterPin: false, // (true) => show the enter/set pin screen, (false) => hide the enter/set pin screen
    };
  }

  componentDidMount() {
    /* Listening for autologin, unsubscribe when finished */
    const unsubscribeAutologin = store.subscribe(() => {
      if (store.getState().services.persist.isHydrated) {
        unsubscribeAutologin();
        this.autologin();
      }
    });

    store.subscribe(() => {
      if (this.state.checkedAutoLogin) {
        if (store.getState().services.session.tokens.access_token !== null) {
          // The access token is set

          // Check if the twofa is enabled and verified
          const twofa = this.is2FANeeded();

          // Check if the pincode is not set or has expired
          const requirePin = this.requirePin();

          this.setState({
            twofa: twofa,
            enterPin: false, //todo:temp set
            public: false,
            isLogged: true,
          });
        } else if (
          store.getState().services.session.tokens.access_token === null &&
          this.state.isLogged
        ) {
          // If the access token is not set, but user is logged in, log him out
          this.setState({
            public: true,
            isLogged: false,
          });
        } else {
          this.setState({
            public: true,
          });
        }
      }
    });
  }

  // AUtologin function
  autologin() {
    console.log("autologging in");
    session
      .refreshToken()
      .then(() => {
        this.setState({isLogged: true, checkedAutoLogin: true, loading: false});
        console.log("session update dispatch: ", store.getState().services.session);

        store.dispatch(
          sessionActions.update(store.getState().services.session)
        );
      })
      .catch(error => {
        this.setState({
          isLogged: false,
          checkedAutoLogin: true,
          loading: false,
        });

        if (
          error &&
          error.response !== undefined &&
          error.response.status === 401
        ) {
          Toast.show({
            text: 'Your token has expired, please login again.',
            position: 'top',
            buttonText: 'X',
            type: 'danger',
          });
        }

        session.logout();
      });
  }

  // Check if 2FA is needed
  is2FANeeded() {
    if (store.getState().services.session.twostep.enabled) {
      // Two step authetnication handler
      if (
        !store.getState().services.session.twostep.verified &&
        this.state.checkedAutoLogin
      ) {
        return true;
      } else {
        store.dispatch(
          sessionActions.verify(store.getState().services.session),
        );
        return false;
      }
    }
  }

  // Check pincode
  requirePin() {
    // If the pin is enabled check if it has expired
    if (store.getState().services.session.pin.enabled) {
      return store.getState().services.session.pin.expired;
    }

    // Require pin by defaulet
    return true;
  }

  // Detect route change and save it to the store
  routeChange = (prevState, currentState) => {
    const getCurrentRouteName = navigationState => {
      if (!navigationState) {
        return null;
      }
      const route = navigationState.routes[navigationState.index];
      if (route.routes) {
        return getCurrentRouteName(route);
      }
      return route.routeName;
    };

    const route = getCurrentRouteName(currentState);
    store.dispatch(routeHistoryActions.push(route));
  };

  render() {
    return (
      <Root>
        <Provider store={store}>
          <Container style={styles.container}>
            {
              // Loading screen
              this.state.loading && <Loading />
            }
            {
              // The two step verification screen
              this.state.twofa && !this.state.loading && <TwoFA />
            }
            {
              // The pin code screen
              !this.state.twofa &&
                !this.state.public &&
                !this.state.loading &&
                this.state.enterPin && <Pincode />
            }
            {
              // Initiate the public area (main screen, first login screen, registration, reset password...)
              !this.state.twofa &&
                !this.state.loading &&
                this.state.public &&
                !this.state.enterPin && (
                  <PublicArea
                    style={styles.container}
                    onNavigationStateChange={this.routeChange}
                  />
                )
            }
            {
              // Initiate the protected user area
              !this.state.twofa &&
                !this.state.loading &&
                !this.state.public &&
                !this.state.enterPin && (
                  <ProtectedArea
                    style={styles.container}
                    onNavigationStateChange={this.routeChange}
                  />
                )
            }
          </Container>
        </Provider>
      </Root>
    );
  }
}

export default App;
