// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('@react-oauth/google', () => {
	const React = require('react');
	return {
		GoogleOAuthProvider: ({ children }) => React.createElement(React.Fragment, null, children),
		GoogleLogin: (props = {}) =>
			React.createElement(
				'button',
				{
					type: 'button',
					'data-testid': 'google-login-mock',
					onClick: props.onClick || null,
				},
				'Google Login Mock'
			),
	};
});
