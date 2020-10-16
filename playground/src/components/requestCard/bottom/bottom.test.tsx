import { mount } from "enzyme";
import { RequestStatus } from "helpers/requestModel";
import * as React from "react";
import Bottom from ".";

describe("<Bottom />", () => {
  const testForStatus = (status: RequestStatus, text: string, icon: string, colorClass: string) => {
    it(`verify label, icon, classes and onClick Callback for ${status}`, () => {
      const onClickCallback = jest.fn();
      const wrapper = mount(<Bottom status={status} onClick={onClickCallback} />);
      const domNode = wrapper.getDOMNode();
      wrapper.simulate("click");
      // split classnames
      // "bottom orange" => ["bottom" , "orange"]
      const classes = domNode.className.split(" ");

      expect(onClickCallback).toHaveBeenCalled(); // onCLick callback
      expect(domNode.children[0].textContent).toBe(text); // label content
      expect(domNode.children[1].getAttribute("data-icon")).toBe(icon); // svg icon
      expect(classes[0]).toBe("bottom"); // default class
      expect(classes[1]).toBe(colorClass); // color class
    });
  };

  testForStatus("notFetched", "Make Request", "play", "blue");
  testForStatus("fetching", "Fetching", "pause", "orange");
  testForStatus("error", "Error, Retry?", "redo", "red");
  testForStatus("sucess", "Success, Retry?", "redo", "green");
});
