/**
 * Accessibility + behavior contract tests for FocusPillTabBar.
 *
 * The tab bar is the primary navigation surface — a regression here
 * breaks every screen-reader and motor-accessibility user. These tests
 * lock in the contracts called out in docs/accessibility-guidelines.md.
 */

import React from "react";
import { renderWithProviders, screen, fireEvent } from "./test-utils";
import { FocusPillTabBar } from "../navigation/FocusPillTabBar";
import {
  expectAccessibleRole,
  expectAccessibleLabel,
  expectAccessibleState,
} from "./a11y-helpers";

jest.mock("../hooks/useAnimationPref", () => ({
  useAnimationPref: () => ({
    animationPref: "full",
    shouldAnimate: true,
    shouldReduceMotion: false,
    setAnimationPref: jest.fn(),
  }),
}));

interface MockTabBarOpts {
  activeIndex?: number;
}

function buildProps({ activeIndex = 0 }: MockTabBarOpts = {}) {
  const dispatch = jest.fn();
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigate = jest.fn();

  const routes = [
    { key: "GoalsTab-1", name: "GoalsTab" as const, params: undefined },
    { key: "BadgesTab-1", name: "BadgesTab" as const, params: undefined },
    { key: "SettingsTab-1", name: "SettingsTab" as const, params: undefined },
  ];

  // The component only reads a small subset of BottomTabBarProps; we cast
  // because constructing the full shape would dwarf the test value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props: any = {
    state: {
      index: activeIndex,
      key: "tab",
      routes,
      routeNames: routes.map((r) => r.name),
      type: "tab",
      stale: false,
      history: [],
    },
    navigation: { dispatch, emit, navigate },
    descriptors: {},
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  };

  return { props, dispatch, emit };
}

describe("FocusPillTabBar", () => {
  it("renders three tabs with role and label", () => {
    const { props } = buildProps();
    renderWithProviders(<FocusPillTabBar {...props} />);

    const goals = screen.getByTestId("tab-GoalsTab");
    const badges = screen.getByTestId("tab-BadgesTab");
    const settings = screen.getByTestId("tab-SettingsTab");

    expectAccessibleRole(goals, "tab");
    expectAccessibleLabel(goals, "Goals");
    expectAccessibleRole(badges, "tab");
    expectAccessibleLabel(badges, "Badges");
    expectAccessibleRole(settings, "tab");
    expectAccessibleLabel(settings, "Settings");
  });

  it("marks the active tab with selected state", () => {
    const { props } = buildProps({ activeIndex: 1 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    expectAccessibleState(screen.getByTestId("tab-GoalsTab"), {
      selected: false,
    });
    expectAccessibleState(screen.getByTestId("tab-BadgesTab"), {
      selected: true,
    });
    expectAccessibleState(screen.getByTestId("tab-SettingsTab"), {
      selected: false,
    });
  });

  it("renders the New Goal FAB when Goals or Badges is active", () => {
    const { props: goalsProps } = buildProps({ activeIndex: 0 });
    const { rerender } = renderWithProviders(
      <FocusPillTabBar {...goalsProps} />,
    );
    expect(screen.queryByTestId("tab-fab-new-goal")).toBeOnTheScreen();

    const { props: badgesProps } = buildProps({ activeIndex: 1 });
    rerender(<FocusPillTabBar {...badgesProps} />);
    expect(screen.queryByTestId("tab-fab-new-goal")).toBeOnTheScreen();
  });

  it("hides the FAB from interaction when Settings is active", () => {
    const { props } = buildProps({ activeIndex: 2 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    // The Pressable still mounts (its fade-out animation owns the lifecycle),
    // but the wrapper disables pointer events so it isn't focusable/tappable.
    const wrapper = screen.getByTestId("tab-fab-wrapper");
    expect(wrapper.props.pointerEvents).toBe("none");
  });

  it("FAB wrapper allows interaction when Goals is active", () => {
    const { props } = buildProps({ activeIndex: 0 });
    renderWithProviders(<FocusPillTabBar {...props} />);
    expect(screen.getByTestId("tab-fab-wrapper").props.pointerEvents).toBe(
      "auto",
    );
  });

  it("FAB has the correct accessibility label", () => {
    const { props } = buildProps();
    renderWithProviders(<FocusPillTabBar {...props} />);
    const fab = screen.getByTestId("tab-fab-new-goal");
    expectAccessibleLabel(fab, "New goal");
    expectAccessibleRole(fab, "button");
  });

  it("FAB navigates to the NewGoal screen inside GoalsTab", () => {
    const { props, dispatch } = buildProps();
    renderWithProviders(<FocusPillTabBar {...props} />);

    fireEvent.press(screen.getByTestId("tab-fab-new-goal"));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "NAVIGATE",
        payload: { name: "GoalsTab", params: { screen: "NewGoal" } },
      }),
    );
  });

  it("pressing an inactive tab dispatches navigate", () => {
    const { props, dispatch, emit } = buildProps({ activeIndex: 0 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    fireEvent.press(screen.getByTestId("tab-BadgesTab"));

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tabPress", target: "BadgesTab-1" }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "NAVIGATE",
        target: "tab",
      }),
    );
  });

  it("pressing the already-active tab does not dispatch navigate", () => {
    const { props, dispatch } = buildProps({ activeIndex: 0 });
    renderWithProviders(<FocusPillTabBar {...props} />);

    fireEvent.press(screen.getByTestId("tab-GoalsTab"));

    // emit fires for tabPress, but navigate dispatch should not.
    const navigateCalls = dispatch.mock.calls.filter(
      ([action]) => action?.type === "NAVIGATE",
    );
    expect(navigateCalls).toHaveLength(0);
  });
});
