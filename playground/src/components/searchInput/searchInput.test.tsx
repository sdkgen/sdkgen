import { mount } from "enzyme";
import * as React from "react";

import { SearchInput } from ".";

describe("<SearchInput />", () => {
  it("simulates onChange events", () => {
    const mockValue = "Hello";
    const onChangeCallback = jest.fn();
    const wrapper = mount(<SearchInput onChange={onChangeCallback} />);
    const input = wrapper.find("input");

    input.simulate("change", { target: { value: mockValue } });
    expect(onChangeCallback).toHaveBeenCalled();
    expect(onChangeCallback).toHaveBeenCalledWith(mockValue);
  });
});
