import { Component, Prop, Vue } from "vue-property-decorator";

@Component({
  name: "MenuLinks"
})
export default class MenuLinks extends Vue {
  @Prop({ default: () => [] })
  routes!: any;
  @Prop() parentRoute!: any;

  getMenuLink({ meta, path }: any) {
    if (meta && meta.menuLinkName) return meta.menuLinkName;

    return path === "" ? "List" : `${path[0].toUpperCase()}${path.slice(1)}`;
  }

  renderMenuLinks(
    createElement: any,
    route: any,
    index: number,
    subGroup: boolean,
    fullPath: string
  ) {
    const id = `${fullPath || ""}-${index}-${route.path}`;
    return createElement(
      "v-list-group",
      {
        props: {
          noAction: true,
          subGroup
        },
        key: id
      },
      [
        MenuLinks.renderActivator(createElement, route),
        this.renderNestedChildren(
          createElement,
          route.children,
          fullPath || route.path.slice(0, -1)
        )
      ]
    );
  }

  static renderActivator(createElement: any, item: any) {
    return createElement(
      "v-list-tile",
      {
        slot: "activator"
      },
      [
        createElement("v-list-tile-content", [
          createElement("v-list-tile-title", item.meta.activatorName)
        ])
      ]
    );
  }

  renderNestedChildren(
    createElement: any,
    children: any[],
    fullPath: string
  ): any {
    return children.map((route: any, index) => {
      if (route.meta && route.meta.activator) {
        return this.renderMenuLinks(
          createElement,
          route,
          index,
          true,
          `${fullPath}/${route.path}`
        );
      }
      if (route.meta.menuItem) {
        return createElement(
          "v-list-tile",
          {
            props: {
              to: `/${fullPath}${route.path ? `/${route.path}` : ""}`,
              exact: true
            }
          },
          [
            createElement("v-list-tile-content", [
              createElement("v-list-tile-title", this.getMenuLink(route))
            ])
          ]
        );
      }
    });
  }

  render(createElement: any) {
    return createElement(
      "div",
      this.renderNestedChildren(
        createElement,
        this.routes,
        this.parentRoute.path.slice(0, -1)
      )
    );
  }
}
