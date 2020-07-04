import addons, { types } from '@storybook/addons';
import Highlight, { defaultProps } from 'prism-react-renderer';
import React, { createElement } from 'react';
import './styles.css';

const ADDON_ID = 'show-vue-markup';
const PANEL_ID = `${ADDON_ID}/panel`;
export const EVENT_ID = `${ADDON_ID}/markup`;

class MarkupPanel extends React.Component {
  state = { markup: '' };

  componentDidMount() {
    const { channel } = this.props;

    channel.on(EVENT_ID, this.onStoryChange);
  }

  componentWillUnmount() {
    const { channel } = this.props;

    channel.off(EVENT_ID, this.onStoryChange);
  }

  onStoryChange = ({ markup }) => {
    this.setState({ markup });
  };

  renderTokens = (tokens, getLineProps, getTokenProps) => {
    return tokens.map((line, i) =>
      createElement(
        'div',
        {
          ...getLineProps({ line, key: i }),
        },
        line.map((token, key) =>
          createElement('span', {
            ...getTokenProps({ token, key }),
          })
        )
      )
    );
  };

  renderChildren = ({
    className,
    style,
    tokens,
    getLineProps,
    getTokenProps,
  }) => {
    return createElement(
      'pre',
      {
        className,
        style,
      },
      this.renderTokens(tokens, getLineProps, getTokenProps)
    );
  };

  render() {
    const { markup } = this.state;
    const { active } = this.props;

    return active
      ? createElement(Highlight, {
          ...defaultProps,
          code: markup,
          language: 'html',
          children: this.renderChildren,
        })
      : null;
  }
}

addons.register(ADDON_ID, () => {
  const channel = addons.getChannel();

  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Markup',
    render: ({ active, key }) =>
      createElement(MarkupPanel, { active, key, channel }),
  });
});
