import {
  BoxData,
  DockMode,
  DropDirection,
  LayoutData,
  PanelData,
  placeHolderStyle, TabBase,
  TabData,
  TabGroup
} from "./DockData";

let _watchObjectChange: WeakMap<any, any> = new WeakMap();

export function getUpdatedObject(obj: any): any {
  let result = _watchObjectChange.get(obj);
  if (result) {
    return getUpdatedObject(result);
  }
  return obj;
}

function clearObjectCache() {
  _watchObjectChange = new WeakMap();
}

function clone<T>(value: T, extra?: any): T {
  let newValue: any = {...value, ...extra};
  if (Array.isArray(newValue.tabs)) {
    newValue.tabs = newValue.tabs.concat();
  }
  if (Array.isArray(newValue.children)) {
    newValue.children = newValue.children.concat();
  }
  _watchObjectChange.set(value, newValue);
  return newValue;
}


let _idCount = 0;

export function nextId() {
  ++_idCount;
  return `+${_idCount}`;
}

let _zCount = 0;

export function nextZIndex(current?: number): number {
  if (current === _zCount) {
    // already the top
    return current;
  }
  return ++_zCount;
}


function findInPanel(panel: PanelData, id: string): PanelData | TabData {
  if (panel.id === id) {
    return panel;
  }
  for (let tab of panel.tabs) {
    if (tab.id === id) {
      return tab;
    }
  }
  return null;
}

function findInBox(box: BoxData, id: string): PanelData | TabData {
  let result: PanelData | TabData;
  for (let child of box.children) {
    if ('children' in child) {
      if (result = findInBox(child, id)) {
        break;
      }
    } else if ('tabs' in child) {
      if (result = findInPanel(child, id)) {
        break;
      }
    }
  }
  return result;
}

export function find(layout: LayoutData, id: string): PanelData | TabData {
  let result = findInBox(layout.dockbox, id);
  if (!result) {
    result = findInBox(layout.floatbox, id);
  }
  return result;
}

export function addNextToTab(layout: LayoutData, source: TabData | PanelData, target: TabData, direction: DropDirection): LayoutData {
  let pos = target.parent.tabs.indexOf(target);
  if (pos >= 0) {
    if (direction === 'after-tab') {
      ++pos;
    }
    return addTabToPanel(layout, source, target.parent, pos);
  }
  return layout;
}

export function addTabToPanel(layout: LayoutData, source: TabData | PanelData, panel: PanelData, idx = -1): LayoutData {
  if (idx === -1) {
    idx = panel.tabs.length;
  }

  let tabs: TabData[];
  let activeId: string;
  if ('tabs' in source) {
    // source is PanelData
    tabs = source.tabs;
    activeId = source.activeId;
  } else {
    // source is TabData
    tabs = [source];
  }

  if (tabs.length) {
    let newPanel = clone(panel);
    newPanel.tabs.splice(idx, 0, ...tabs);
    newPanel.activeId = tabs[tabs.length - 1].id;
    for (let tab of tabs) {
      tab.parent = newPanel;
    }
    if (activeId) {
      newPanel.activeId = activeId;
    }
    layout = replacePanel(layout, panel, newPanel);
  }

  return layout;
}

export function converToPanel(source: TabData | PanelData): PanelData {
  if ('tabs' in source) {
    // source is already PanelData
    return source;
  } else {
    let newPanel: PanelData = {tabs: [source], group: source.group, activeId: source.id};
    source.parent = newPanel;
    return newPanel;
  }
}

export function dockPanelToPanel(layout: LayoutData, newPanel: PanelData, panel: PanelData, direction: DropDirection): LayoutData {
  let box = panel.parent;
  let dockMode: DockMode = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';
  let afterPanel = (direction === 'bottom' || direction === 'right');

  let pos = box.children.indexOf(panel);
  if (pos >= 0) {
    let newBox = clone(box);
    if (dockMode === box.mode) {
      if (afterPanel) {
        ++pos;
      }
      panel.size *= 0.5;
      newPanel.size = panel.size;
      newBox.children.splice(pos, 0, newPanel);
    } else {
      let newChildBox: BoxData = {mode: dockMode, children: []};
      newChildBox.size = panel.size;
      if (afterPanel) {
        newChildBox.children = [panel, newPanel];
      } else {
        newChildBox.children = [newPanel, panel];
      }
      panel.parent = newChildBox;
      panel.size = 200;
      newPanel.parent = newChildBox;
      newPanel.size = 200;
      newBox.children[pos] = newChildBox;
      newChildBox.parent = newBox;
    }
    return replaceBox(layout, box, newBox);
  }
  return layout;
}

export function dockPanelToBox(layout: LayoutData, newPanel: PanelData, box: BoxData, direction: DropDirection): LayoutData {
  let parentBox = box.parent;
  let dockMode: DockMode = (direction === 'left' || direction === 'right') ? 'horizontal' : 'vertical';

  let afterPanel = (direction === 'bottom' || direction === 'right');

  if (parentBox) {
    let pos = parentBox.children.indexOf(box);
    if (pos >= 0) {
      let newParentBox = clone(parentBox);
      if (dockMode === parentBox.mode) {
        if (afterPanel) {
          ++pos;
        }
        newPanel.size = box.size * 0.3;
        box.size *= 0.7;

        newParentBox.children.splice(pos, 0, newPanel);
      } else {
        let newChildBox: BoxData = {mode: dockMode, children: []};
        newChildBox.size = box.size;
        if (afterPanel) {
          newChildBox.children = [box, newPanel];
        } else {
          newChildBox.children = [newPanel, box];
        }
        box.parent = newChildBox;
        box.size = 280;
        newPanel.parent = newChildBox;
        newPanel.size = 120;
        newParentBox.children[pos] = newChildBox;
      }
      return replaceBox(layout, parentBox, newParentBox);
    }
  } else if (box === layout.dockbox) {
    let newBox = clone(box);
    if (dockMode === box.mode) {
      let pos = 0;
      if (afterPanel) {
        pos = newBox.children.length;
      }
      newPanel.size = box.size * 0.3;
      box.size *= 0.7;

      newBox.children.splice(pos, 0, newPanel);
      return replaceBox(layout, box, newBox);
    } else {
      // replace root dockbox

      let newDockBox: BoxData = {mode: dockMode, children: []};
      newDockBox.size = box.size;
      if (afterPanel) {
        newDockBox.children = [newBox, newPanel];
      } else {
        newDockBox.children = [newPanel, newBox];
      }
      newBox.size = 280;
      newPanel.size = 120;
      return replaceBox(layout, box, newDockBox);
    }
  }

  return layout;
}

export function floatPanel(
  layout: LayoutData, newPanel: PanelData,
  rect?: {left: number, top: number, width: number, height: number}
): LayoutData {
  let newBox = clone(layout.floatbox);
  if (rect) {
    newPanel.x = rect.left;
    newPanel.y = rect.top;
    newPanel.w = rect.width;
    newPanel.h = rect.height;
  }

  newBox.children.push(newPanel);
  return replaceBox(layout, layout.floatbox, newBox);
}

export function removeFromLayout(layout: LayoutData, source: TabData | PanelData): LayoutData {
  if (source) {
    if ('tabs' in source) {
      return removePanel(layout, source);
    } else {
      return removeTab(layout, source);
    }
  }
}

function removePanel(layout: LayoutData, panel: PanelData): LayoutData {
  let box = panel.parent;
  if (box) {
    let pos = box.children.indexOf(panel);
    if (pos >= 0) {
      let newBox = clone(box);
      newBox.children.splice(pos, 1);
      return replaceBox(layout, box, newBox);
    }
  }
  return layout;
}

function removeTab(layout: LayoutData, tab: TabData): LayoutData {
  let panel = tab.parent;
  if (panel) {
    let pos = panel.tabs.indexOf(tab);
    if (pos >= 0) {
      let newPanel = clone(panel);
      newPanel.tabs.splice(pos, 1);
      if (newPanel.activeId === tab.id) {
        // update selection id
        if (newPanel.tabs.length > pos) {
          newPanel.activeId = newPanel.tabs[pos].id;
        } else if (newPanel.tabs.length) {
          newPanel.activeId = newPanel.tabs[0].id;
        }
      }
      return replacePanel(layout, panel, newPanel);
    }
  }
  return layout;
}

// move float panel into the screen
export function fixFloatPanelPos(layout: LayoutData, layoutWidth?: number, layoutHeight?: number): LayoutData {
  let layoutChanged = false;
  if (layout && layout.floatbox && layoutWidth > 200 && layoutHeight > 200) {
    let newFloatChildren = layout.floatbox.children.concat();
    for (let i = 0; i < newFloatChildren.length; ++i) {
      let panel: PanelData = newFloatChildren[i] as PanelData;
      let panelChange: any = {};
      if (panel.w > layoutWidth) {
        panelChange.w = layoutWidth;
      }
      if (panel.h > layoutHeight) {
        panelChange.h = layoutHeight;
      }
      if (panel.y > layoutHeight - 16) {
        panelChange.y = Math.max(layoutHeight - 16 - (panel.h >> 1), 0);
      } else if (panel.y < 0) {
        panelChange.y = 0;
      }

      if (panel.x + panel.w < 16) {
        panelChange.x = 16 - (panel.w >> 1);
      } else if (panel.x > layoutWidth - 16) {
        panelChange.x = layoutWidth - 16 - (panel.w >> 1);
      }
      if (Object.keys(panelChange).length) {
        newFloatChildren[i] = clone(panel, panelChange);
        layoutChanged = true;
      }
    }
    if (layoutChanged) {
      let newBox = clone(layout.floatbox);
      newBox.children = newFloatChildren;
      return replaceBox(layout, layout.floatbox, newBox);
    }
  }

  return layout;
}

export function fixLayoutData(layout: LayoutData, loadTab?: (tab: TabBase) => TabData): LayoutData {

  function fixpanelOrBox(d: PanelData | BoxData) {
    if (d.id == null) {
      d.id = nextId();
    } else if (d.id.startsWith('+')) {
      let idnum = Number(d.id);
      if (idnum > _idCount) {
        // make sure generated id is unique
        _idCount = idnum;
      }
    }
    if (!(d.size >= 0)) {
      d.size = 200;
    }
    d.minWidth = 0;
    d.minHeight = 0;
  }

  function fixPanelData(panel: PanelData): PanelData {
    fixpanelOrBox(panel);
    let findActiveId = false;
    if (loadTab) {
      for (let i = 0; i < panel.tabs.length; ++i) {
        panel.tabs[i] = loadTab(panel.tabs[i]);
      }
    }
    for (let child of panel.tabs) {
      child.parent = panel;
      if (child.id === panel.activeId) {
        findActiveId = true;
      }
      if (child.minWidth > panel.minWidth) panel.minWidth = child.minWidth;
      if (child.minHeight > panel.minHeight) panel.minHeight = child.minHeight;
    }
    if (!findActiveId && panel.tabs.length) {
      panel.activeId = panel.tabs[0].id;
    }
    if (panel.minWidth <= 0) {
      panel.minWidth = 1;
    }
    if (panel.minHeight <= 0) {
      panel.minHeight = 1;
    }
    if (panel.group == null && panel.tabs.length) {
      panel.group = panel.tabs[0].group;
    }
    if (panel.z > _zCount) {
      // make sure next zIndex is on top
      _zCount = panel.z;
    }
    return panel;
  }

  function fixBoxData(box: BoxData): BoxData {
    fixpanelOrBox(box);
    for (let i = 0; i < box.children.length; ++i) {
      let child = box.children[i];
      child.parent = box;
      if ('children' in child) {
        fixBoxData(child);
        if (child.children.length === 0) {
          // remove box with no child
          box.children.splice(i, 1);
          --i;
        } else if (child.children.length === 1) {
          // box with one child should be merged back to parent box
          let subChild = child.children[0];
          if ((subChild as BoxData).mode === box.mode) {
            // sub child is another box that can be merged into current box
            let totalSubSize = 0;
            for (let subsubChild of (subChild as BoxData).children) {
              totalSubSize += subsubChild.size;
            }
            let sizeScale = child.size / totalSubSize;
            for (let subsubChild of (subChild as BoxData).children) {
              subsubChild.size *= sizeScale;
            }
            // merge children up
            box.children.splice(i, 1, ...(subChild as BoxData).children);
          } else {
            // sub child can be moved up one layer
            subChild.size = child.size;
            box.children[i] = subChild;
          }
          --i;
        }
      } else if ('tabs' in child) {
        fixPanelData(child);
        if (child.tabs.length === 0) {
          // remove panel with no tab
          if (!child.panelLock) {
            box.children.splice(i, 1);
            --i;
          } else if (child.group === placeHolderStyle && (box.children.length > 1 || box.parent)) {
            // remove placeHolder Group
            box.children.splice(i, 1);
            --i;
          }
        }
      }
      // merge min size
      switch (box.mode) {
        case 'horizontal':
          if (child.minWidth > 0) box.minWidth += child.minWidth;
          if (child.minHeight > box.minHeight) box.minHeight = child.minHeight;
          break;
        case 'vertical':
          if (child.minWidth > box.minWidth) box.minWidth = child.minWidth;
          if (child.minHeight > 0) box.minHeight += child.minHeight;
          break;
      }
    }
    // add divider size
    if (box.children.length > 1) {
      switch (box.mode) {
        case 'horizontal':
          box.minWidth += (box.children.length - 1) * 4;
          break;
        case 'vertical':
          box.minHeight += (box.children.length - 1) * 4;
          break;
      }
    }

    return box;
  }

  if (!('floatbox' in layout)) {
    layout.floatbox = {mode: 'float', children: [], size: 1};
  } else {
    layout.floatbox.mode = 'float';
  }

  fixBoxData(layout.dockbox);
  fixBoxData(layout.floatbox);

  if (layout.dockbox.children.length === 0) {
    // add place holder panel when root box is empty
    let newPanel: PanelData = {id: '+0', group: placeHolderStyle, panelLock: {}, size: 200, tabs: []};
    newPanel.parent = layout.dockbox;
    layout.dockbox.children.push(newPanel);
  } else {
    // merge and replace root box when box has only one child
    while (layout.dockbox.children.length === 1 && 'children' in layout.dockbox.children[0]) {
      let newDockBox = clone(layout.dockbox.children[0] as BoxData);
      layout.dockbox = newDockBox;
      for (let child of newDockBox.children) {
        child.parent = newDockBox;
      }
    }
  }
  layout.dockbox.parent = null;
  layout.floatbox.parent = null;
  clearObjectCache();
  return layout;
}


function replacePanel(layout: LayoutData, panel: PanelData, newPanel: PanelData): LayoutData {
  for (let tab of newPanel.tabs) {
    tab.parent = newPanel;
  }

  let box = panel.parent;
  if (box) {
    let pos = box.children.indexOf(panel);
    if (pos >= 0) {
      let newBox = clone(box);
      newBox.children[pos] = newPanel;
      return replaceBox(layout, box, newBox);
    }
  }
  return layout;
}

function replaceBox(layout: LayoutData, box: BoxData, newBox: BoxData): LayoutData {
  for (let child of newBox.children) {
    child.parent = newBox;
  }

  let parentBox = box.parent;
  if (parentBox) {
    let pos = parentBox.children.indexOf(box);
    if (pos >= 0) {
      let newParentBox = clone(parentBox);
      newParentBox.children[pos] = newBox;
      return replaceBox(layout, parentBox, newParentBox);
    }
  } else {
    if (box.id === layout.dockbox.id || box === layout.dockbox) {
      return {...layout, dockbox: newBox};
    } else if (box.id === layout.floatbox.id || box === layout.floatbox) {
      return {...layout, floatbox: newBox};
    }
  }
  return layout;
}