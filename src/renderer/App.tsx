/* eslint-disable no-mixed-spaces-and-tabs */
import {
  Accordion,
  Alert,
  Button,
  Divider,
  Kbd,
  LoadingOverlay,
  MantineProvider,
  Menu,
  NumberInput,
  Select,
  Slider,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  useClickOutside,
  useDocumentTitle,
  useHotkeys,
  useWindowEvent,
} from '@mantine/hooks';
import { ModalsProvider, useModals } from '@mantine/modals';
import {
  NotificationsProvider,
  showNotification,
  updateNotification,
} from '@mantine/notifications';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBoxMultiple,
  IconBrush,
  IconCheck,
  IconChevronRight,
  IconClipboard,
  IconClock,
  IconDeviceFloppy,
  IconDots,
  IconEye,
  IconFile,
  IconFileDownload,
  IconFolder,
  IconHome,
  IconKeyboard,
  IconLayoutNavbar,
  IconMinus,
  IconPlus,
  IconQuestionMark,
  IconRefresh,
  IconReplace,
  IconScan,
  IconSettings,
  IconTrashX,
  IconX,
} from '@tabler/icons';
import { AnimatePresence, motion, Transition, Variants } from 'framer-motion';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Settings, Field, Api } from './api';

const SZ_MULTIPLIER = 5.555555555555555;

const App = () => {
  const [fields, setFieldsClean] = useState<Field[]>([]);
  const [editField, setEditField] = useState<Field>();
  const [fieldIndex, setFieldIndex] = useState(0);
  const [loadingOverlay, setLoadingOverlay] = useState(false);
  const [file, setFile] = useState<string>(undefined);
  const [docTitle, setDocTitle] = useState('Start - Graintfa');
  const [screen, setScreen] = useState<'start' | 'editor'>('start');
  const [recent, setRecent] = useState<string[]>([]);
  const [renderStart, setRenderStart] = useState(0);
  const [renderEnd, setRenderEnd] = useState(0);
  const [settings, setSettings] = useState<Settings>(undefined);
  const titleBar = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<JSX.Element>();

  const [_reloadState, reloadState] = useState(true);

  window.addEventListener('resize', () => reloadState((v) => !v));

  const [resourcePath, setResourcePath] = useState('');
  function getResourcePath(file: string) {
    if (!resourcePath || resourcePath.length < 1) return '';
    return (
      'file:///' +
      resourcePath +
      (!resourcePath.endsWith('/') && resourcePath.length > 0 ? '/' : '') +
      (file.startsWith('/') ? file.substring(1) : file)
    );
  }

  async function getImageSizes(path: string) {
    await fetch(path);
    const el = document.createElement('img');
    el.src = path;
    await new Promise((r) =>
      el.naturalWidth > 0 && el.naturalHeight > 0
        ? r(undefined)
        : el.addEventListener('load', r)
    );
    document.body.append(el);
    const size = {
      width: el.naturalWidth,
      height: el.naturalHeight,
    };
    el.remove();
    return size;
  }

  useEffect(() => {
    Api.getSettings().then(setSettings);
    Api.getResourcePath().then(setResourcePath);
  }, []);

  useWindowEvent('blur', () => {
    titleBar.current.classList.add('opacity-50');
  });
  useWindowEvent('focus', () => {
    titleBar.current.classList.remove('opacity-50');
  });

  const modals = useModals();

  const setFields = (newFields: Field[]) => {
    setDocTitle((t) => (!t.startsWith('*') ? `*${t}` : t));
    setFieldsClean(newFields);
  };

  const cloneFields = () => {
    const selectedFields = fields.filter((f) => f.selected);
    const clonedFields: Field[] = [];

    selectedFields.forEach((f, i) => {
      const field: Field = {
        x: f.x,
        y: f.y,
        name: `field ${fieldIndex + 1 + i}`,
        selected: true,
        highlighted: false,
        id: fieldIndex + 1 + i,
        rename: false,
        height: 18,
        width: 18,
      };
      clonedFields.push(field);
    });
    setFieldIndex((i) => i + selectedFields.length);

    setFields([
      ...fields.map((f) => {
        f.selected = false;
        f.highlighted = false;
        return f;
      }),
      ...clonedFields,
    ]);
  };

  useDocumentTitle(docTitle);

  const guiImg = useRef<HTMLImageElement>(null);
  const guiEditor = useRef<HTMLDivElement>(null);
  const fieldImg = useRef<HTMLImageElement>(null);

  const deleteSelected = () => {
    const selected = fields.filter((f) => f.selected);
    if (selected.length <= 0) return;
    selected.forEach((f) => {
      fields.splice(fields.indexOf(f), 1);
    });
    setFields(fields.map((f) => f));
    showNotification({
      message: `Deleted ${selected.length} element${
        selected.length == 1 ? '' : 's'
      }.`,
      title: 'Success',
      icon: <IconTrashX />,
      color: 'red',
    });
    setEditField(undefined);
  };

  const moveSelected = (
    direction: 'left' | 'right' | 'up' | 'down',
    step = 1
  ) => {
    const selected = fields.filter((f) => f.selected);
    if (selected.length <= 0) return;

    selected.forEach((f) => {
      const i = fields.indexOf(f);
      switch (direction) {
        case 'down':
          if (
            f.y + step >= 0 &&
            f.y + step <=
              guiImg.current.offsetHeight -
                f.height * SZ_MULTIPLIER * (f.scale || 0)
          )
            f.y += step;
          else
            f.y =
              guiImg.current.offsetWidth -
              f.width * SZ_MULTIPLIER * (f.scale || 0);
          break;
        case 'up':
          if (
            f.y - step >= 0 &&
            f.y - step <=
              guiImg.current.offsetHeight -
                f.height * SZ_MULTIPLIER * (f.scale || 0)
          )
            f.y -= step;
          else f.y = 0;
          break;
        case 'left':
          if (
            f.x - step >= 0 &&
            f.x - step <=
              guiImg.current.offsetWidth -
                f.width * SZ_MULTIPLIER * (f.scale || 0)
          )
            f.x -= step;
          else f.x = 0;

          break;
        case 'right':
          if (
            f.x + step >= 0 &&
            f.x + step <=
              guiImg.current.offsetWidth -
                f.width * SZ_MULTIPLIER * (f.scale || 0)
          )
            f.x += step;
          else
            f.x =
              guiImg.current.offsetWidth -
              f.width * SZ_MULTIPLIER * (f.scale || 0);
          break;
      }

      fields[i] = f;

      if (selected.length == 1) {
        setEditField(f);
      }
    });

    setFields(fields.map((f) => f));
  };

  const RenderCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRefs: Record<
      string,
      React.MutableRefObject<HTMLImageElement>
    > = {};

    const draw = (ctx: CanvasRenderingContext2D) => {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(guiImg.current, 0, 0, 176 * 4, 168 * 4);
      fields.forEach((f) => {
        fieldImg.current.src = f.texture
          ? f.texture
          : getResourcePath('minecraft_inv_field_small.png');
        ctx.drawImage(
          fieldImg.current,
          Math.floor(f.x / 1.36),
          Math.floor(f.y / 1.36),
          (f.width !== 18 ? 3.55555555556 : 4) * f.width * (f.scale || 1),
          (f.width !== 18 ? 3.55555555556 : 4) * f.height * (f.scale || 1)
        );
        if (f.image && imageRefs[f.id]?.current && !f.texture) {
          ctx.filter = `saturate(${f.image.saturation ? '100%' : '0%'})`;
          ctx.globalAlpha = f.image.opacity;
          ctx.drawImage(
            imageRefs[f.id].current,
            Math.floor(f.x / 1.36 + 8),
            Math.floor(f.y / 1.36 + 8),
            (f.width !== 18 ? 3.55555555556 : 4) * f.width * (f.scale || 1) -
              18,
            (f.width !== 18 ? 3.55555555556 : 4) * f.height * (f.scale || 1) -
              18
          );
          ctx.filter = 'none';
          ctx.globalAlpha = 1;
        }
      });
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      context.imageSmoothingEnabled = false;

      draw(context);

      setLoadingOverlay(false);

      setRenderEnd(Date.now());
      updateNotification({
        id: 'render',
        color: 'green',
        title: 'Render completed!',
        message: 'The render was completed successfully.',
        icon: <IconCheck />,
        autoClose: 2000,
      });
    }, [draw]);

    return (
      <>
        <div className="fixed top-12 right-12">
          <Menu
            placement="end"
            withArrow
            transition="slide-up"
            transitionDuration={400}
            transitionTimingFunction="ease"
            control={
              <Button variant="outline" color="cyan">
                Render menu
              </Button>
            }
          >
            <Menu.Label>Render time</Menu.Label>
            <Menu.Item icon={<IconClock />} disabled>
              {renderEnd - renderStart}ms
            </Menu.Item>
            <Divider></Divider>
            <Menu.Label>Render actions</Menu.Label>
            <Menu.Item
              icon={<IconClipboard />}
              onClick={() => {
                canvasRef.current.toBlob((b) => {
                  const item = new ClipboardItem({ 'image/png': b });
                  navigator.clipboard.write([item]);
                  showNotification({
                    message: 'Copied!',
                    color: 'green',
                    icon: <IconCheck />,
                  });
                });
              }}
            >
              Copy to clipboard
            </Menu.Item>
            <Menu.Item
              icon={<IconDeviceFloppy />}
              onClick={() => {
                canvasRef.current.toBlob((b) => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = window.URL.createObjectURL(b);
                  downloadLink.download = 'graintfaGUI.png';
                  downloadLink.click();
                  downloadLink.remove();
                  showNotification({
                    message: 'Saved!',
                    color: 'green',
                    icon: <IconCheck />,
                  });
                });
              }}
            >
              Save
            </Menu.Item>
            <Menu.Item
              icon={<IconFileDownload />}
              onClick={() => {
                canvasRef.current.toBlob((b) => {
                  const downloadLink = document.createElement('a');
                  downloadLink.href = window.URL.createObjectURL(b);
                  downloadLink.download = 'graintfaGUI.png';
                  downloadLink.click();
                  downloadLink.remove();
                  showNotification({
                    message: 'Saved!',
                    color: 'green',
                    icon: <IconCheck />,
                  });
                  const item = new ClipboardItem({ 'image/png': b });
                  navigator.clipboard.write([item]);
                  showNotification({
                    message: 'Copied!',
                    color: 'green',
                    icon: <IconCheck />,
                  });
                });
              }}
            >
              Save & Copy
            </Menu.Item>
          </Menu>
          <Title>Fields</Title>
          {fields
            .filter((el) => !el.name.startsWith('__'))
            .map((el) => (
              <Text key={el.name}>
                {el.name}: X: {el.x + 1} | Y: {el.y + 1} | Width: {el.width - 2}{' '}
                | Height: {el.height - 2}
              </Text>
            ))}
        </div>
        <div>
          <canvas
            className="inline"
            ref={canvasRef}
            width={176 * 4}
            height={168 * 4}
          />
        </div>
        <div className="hidden">
          {fields
            .filter((f) => f.image != undefined)
            .map((f, i) => {
              imageRefs[f.id] = useRef<HTMLImageElement>();
              return (
                <img
                  width={0}
                  height={0}
                  src={f.image.path}
                  ref={imageRefs[f.id]}
                  style={{
                    opacity: f.image.opacity,
                  }}
                  key={i}
                />
              );
            })}
        </div>
      </>
    );
  };

  const renderGUI = () => {
    if (screen != 'editor') {
      showNotification({
        title: 'No!',
        message: 'You can only render in the editor! Please open a file first.',
        color: 'red',
        icon: <IconX />,
      });
      return;
    }
    showNotification({
      id: 'render',
      loading: true,
      title: 'Rendering...',
      message: 'Your GUI is being rendered...',
      autoClose: false,
      disallowClose: true,
    });
    modals.closeModal('render');
    setRenderStart(Date.now());
    setLoadingOverlay(true);
    modals.openModal({
      size: 'full',
      title: 'Render',
      children: (
        <div style={{ width: '256px', height: '256px' }}>
          <RenderCanvas />
        </div>
      ),
      overlayBlur: 3,
      overlayOpacity: 0.55,
      classNames: {
        modal: 'h-[calc(100vh-6rem)]',
      },
    });
  };

  const openFile = (filePath?: string) => {
    setScreen('editor');
    Api.setEditorRpc();
    setTimeout(() => {
      setLoadingOverlay(true);
      Api.open(filePath).then((res) => {
        if (!res) return;
        const resType: {
          fieldIndex: number;
          fields: Field[];
          filePath: string;
        } = res;

        setFieldIndex(resType.fieldIndex);
        setFile(resType.filePath);
        setDocTitle(`${resType.filePath.split('\\').pop()} - Graintfa`);
        setLoadingOverlay(false);
        setFieldsClean(
          resType.fields.map((x) => {
            x.selected = false;
            x.highlighted = false;
            x.rename = false;
            return x;
          })
        );
        showNotification({
          title: 'File loaded!',
          message: `Loaded ${resType.filePath.split('\\').pop()} from ${
            resType.filePath
          }!`,
          color: 'cyan',
          icon: <IconFolder></IconFolder>,
        });
      });
    }, 400);
  };

  const saveFile = (filePath?: string, cb?: () => void) => {
    setLoadingOverlay(true);
    Api.save({
      fields: fields.map((f) => {
        f.rename = false;
        return f;
      }),
      filePath: filePath || '',
      fieldIndex,
    }).then((file) => {
      setLoadingOverlay(false);
      if (!file) return;
      setFile(file);
      setDocTitle(`${file.split('\\').pop()} - Graintfa`);

      showNotification({
        title: 'File saved!',
        message: `Saved ${file.split('\\').pop()} to ${file}.`,
        color: 'green',
        icon: <IconDeviceFloppy />,
      });
      if (cb) cb();
    });
  };

  const openHomeScreen = () => {
    if (screen !== 'start')
      if (document.title.startsWith('*'))
        askForClose(() => {
          setLoadingOverlay(true);
          window.location.reload();
        });
      else {
        setLoadingOverlay(true);
        window.location.reload();
      }
    else
      showNotification({
        message: "You're already on the start screen!",
        color: 'red',
      });
  };

  const hotkeys: {
    hotkey: string;
    title: string;
    group: string;
    onPress: () => void;
  }[] = [
    {
      hotkey: 'mod+shift+s',
      group: 'File',
      title: 'Save As',
      onPress() {
        saveFile();
      },
    },
    {
      hotkey: 'mod+c',
      group: 'Editor',
      title: 'Clone selected fields',
      onPress: () => {
        cloneFields();
      },
    },
    {
      hotkey: 'mod+w',
      title: 'Rename field',
      group: 'Editor',
      onPress: () => {
        const selectedFields = fields.filter((f) => f.selected);

        if (selectedFields.length < 1) return;

        const field = fields.find((f) => f.id === selectedFields[0].id);

        const i = fields.indexOf(field);

        field.rename = true;

        fields[i] = field;

        setFields(fields.map((x) => x));
      },
    },
    {
      hotkey: 'mod+alt+s',
      title: 'Open Shortcuts',
      group: 'General',
      onPress: () => {
        openHotkeys();
      },
    },
    {
      hotkey: 'mod+,',
      title: 'Open Settings',
      group: 'General',
      onPress: () => {
        openSettings();
      },
    },
    {
      hotkey: 'f2',
      title: 'Rerender fields',
      group: 'Editor',
      onPress: () => {
        if (screen != 'editor') {
          showNotification({
            title: 'U sure?',
            message: 'Rerendering fields affects the editor only.',
            color: 'yellow',
            icon: <IconQuestionMark />,
          });
          return;
        }
        setFields(fields.map((x) => x));
        showNotification({
          message: 'Rerendered successfully.',
          color: 'green',
          autoClose: 1000,
          icon: <IconCheck />,
        });
      },
    },
    {
      hotkey: 'f12',
      title: 'Render GUI',
      group: 'Editor',
      onPress: () => {
        renderGUI();
      },
    },
    {
      hotkey: 'delete',
      title: 'Remove selected fields',
      group: 'Editor',
      onPress: deleteSelected,
    },
    {
      hotkey: 'backspace',
      group: 'Editor',
      title: 'Remove selected fields',
      onPress: deleteSelected,
    },
    {
      hotkey: 'arrowleft',
      title: 'Move selected fields left',
      group: 'Editor',
      onPress: () => {
        moveSelected('left');
      },
    },
    {
      hotkey: 'arrowright',
      title: 'Move selected fields right',
      group: 'Editor',
      onPress: () => {
        moveSelected('right');
      },
    },
    {
      hotkey: 'arrowup',
      title: 'Move selected fields up',
      group: 'Editor',
      onPress: () => {
        moveSelected('up');
      },
    },
    {
      hotkey: 'arrowdown',
      title: 'Move selected fields down',
      group: 'Editor',
      onPress: () => {
        moveSelected('down');
      },
    },
    {
      hotkey: 'shift+arrowleft',
      title: 'Move selected fields left 10px',
      group: 'Editor',
      onPress: () => {
        moveSelected('left', 10);
      },
    },
    {
      hotkey: 'shift+arrowright',
      title: 'Move selected fields right 10px',
      group: 'Editor',
      onPress: () => {
        moveSelected('right', 10);
      },
    },
    {
      hotkey: 'shift+arrowup',
      title: 'Move selected fields up 10px',
      group: 'Editor',
      onPress: () => {
        moveSelected('up', 10);
      },
    },
    {
      hotkey: 'shift+arrowdown',
      title: 'Move selected fields down 10px',
      group: 'Editor',
      onPress: () => {
        moveSelected('down', 10);
      },
    },
    {
      hotkey: 'mod+shift+arrowleft',
      title: 'Move selected fields left 100px',
      group: 'Editor',
      onPress: () => {
        moveSelected('left', 100);
      },
    },
    {
      hotkey: 'mod+shift+arrowright',
      title: 'Move selected fields right 100px',
      group: 'Editor',
      onPress: () => {
        moveSelected('right', 100);
      },
    },
    {
      hotkey: 'mod+shift+arrowup',
      title: 'Move selected fields up 100px',
      group: 'Editor',
      onPress: () => {
        moveSelected('up', 100);
      },
    },
    {
      hotkey: 'mod+shift+arrowdown',
      title: 'Move selected fields down 100px',
      group: 'Editor',
      onPress: () => {
        moveSelected('down', 100);
      },
    },
    {
      hotkey: 'mod+a',
      title: 'Select all fields',
      group: 'Editor',
      onPress: () => {
        fields.map((f) => {
          f.selected = true;
          f.highlighted = false;
          return f;
        });

        setFields(fields.map((f) => f));
        setEditField(undefined);
      },
    },
    {
      hotkey: 'mod+d',
      title: 'Deselect all fields',
      group: 'Editor',
      onPress: () => {
        fields.map((f) => {
          f.selected = false;
          f.highlighted = false;
          return f;
        });

        setFields(fields.map((f) => f));
        setEditField(undefined);
      },
    },
    {
      hotkey: 'mod+s',
      title: 'Save file',
      group: 'File',
      onPress: () => {
        saveFile(file);
      },
    },
    {
      hotkey: 'mod+o',
      title: 'Open file',
      group: 'File',
      onPress: () => {
        openFile();
      },
    },
    {
      hotkey: 'mod+h',
      title: 'Home screen',
      group: 'Window',
      onPress: () => {
        openHomeScreen();
      },
    },
    {
      hotkey: 'mod+n',
      title: 'New file',
      group: 'File',
      onPress: () => {
        setScreen('editor');
      },
    },
  ];

  const openHotkeys = () => {
    const optimizeKeyName = (key: string) => {
      switch (key) {
        case 'mod':
          key = 'Ctrl';
          break;
        case 'arrowup':
          key = '⬆';
          break;
        case 'arrowdown':
          key = '⬇';
          break;
        case 'arrowleft':
          key = '⬅';
          break;
        case 'arrowright':
          key = '➡';
          break;
        default:
          {
            const letters = key.split('');
            letters[0] = letters[0].toUpperCase();
            key = letters.join('');
          }
          break;
      }
      return key;
    };

    modals.openModal({
      size: 'full',
      children: (
        <>
          <h1>
            <IconKeyboard className="inline my-auto mr-2" />
            Hotkeys
          </h1>

          {Array.from(new Set(hotkeys.map((k) => k.group)).values())
            .sort((a, b) => (a > b ? 1 : -1))
            .map((g, i) => {
              return (
                <div key={`hotkey group ${i}`}>
                  <Divider my="xs" label={g} labelPosition="center" />
                  <div className="grid grid-cols-4 gap-4">
                    {hotkeys
                      .filter((k) => k.group == g)
                      .sort((a, b) => (a.title > b.title ? 1 : -1))
                      .map((k, i) => {
                        return (
                          <div key={`hotkey ${i}`}>
                            <p>{k.title}</p>

                            {k.hotkey.split('+').map((k, i) => {
                              k = optimizeKeyName(k);
                              return <Kbd key={i}>{k}</Kbd>;
                            })}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
        </>
      ),
    });
  };

  useHotkeys(
    hotkeys.map((k) => {
      return [k.hotkey, k.onPress];
    })
  );

  const FieldText = (props: { name: string; id: number; field: Field }) => {
    const { name, id, field: f } = props;
    if (f.rename) {
      const input = useRef<HTMLInputElement>(null);
      useEffect(() => {
        input.current.focus();
      }, []);
      return (
        <TextInput
          variant="unstyled"
          defaultValue={f.name}
          ref={input}
          className="dark:bg-gray-600 bg-gray-300 px-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.currentTarget.value.length < 1) {
                fields[fields.indexOf(f)].rename = false;
                setFields(fields.map((x) => x));
                return;
              }
              fields[fields.indexOf(f)].rename = false;
              fields[fields.indexOf(f)].name = e.currentTarget.value;
              setFields(fields.map((x) => x));
              e.currentTarget.value;
            }
            if (e.key === 'Escape') {
              fields[fields.indexOf(f)].rename = false;
              setFields(fields.map((x) => x));
            }
          }}
          onBlur={() => {
            fields[fields.indexOf(f)].rename = false;
            setFields(fields.map((x) => x));
          }}
        />
      );
    }
    return (
      <p
        className={`px-4 ${
          f.highlighted || f.selected
            ? 'dark:bg-gray-600 bg-gray-300'
            : 'hover:dark:bg-gray-600 hover:bg-gray-300'
        }`}
        onClick={(e) => {
          if (e.shiftKey) {
            const selected = fields.filter((f) => f.selected);
            const from = Math.min(...selected.map((f) => f.id), id);
            const to = Math.max(...selected.map((f) => f.id), id);
            setFields(
              fields.map((f, i) => {
                if (f.id == id) f.selected = !f.selected;
                if (i >= from && i <= to) f.selected = true;
                f.highlighted = false;
                return f;
              })
            );
            setEditField(undefined);
          } else {
            const index = fields.indexOf(f);

            if (!f.selected) setEditField(fields[index]);
            else setEditField(undefined);

            const selected = f.selected;

            if (!e.ctrlKey)
              fields.forEach((f, i) => {
                fields[i].selected = false;
                fields[i].highlighted = false;
              });
            fields[index].selected = !selected;

            setFields(fields.map((f) => f));
          }
        }}
      >
        {name}
      </p>
    );
  };

  const Field = (props: { field: Field; id: number }) => {
    const { field: f, id } = props;

    return (
      <div
        style={{
          width: `${f.width * SZ_MULTIPLIER * (f.scale || 1)}px`,
          height: `${f.height * SZ_MULTIPLIER * (f.scale || 1)}px`,
          top: `${f.y + guiImg.current.offsetTop - (f.selected ? 4 : 0)}px`,
          left: `${f.x + guiImg.current.offsetLeft - (f.selected ? 4 : 0)}px`,
        }}
        className="absolute"
      >
        <img
          draggable="false"
          ref={fieldImg}
          src={
            f.texture
              ? f.texture
              : getResourcePath('minecraft_inv_field_small.png')
          }
          width={f.width * SZ_MULTIPLIER * (f.scale || 1)}
          height={f.height * SZ_MULTIPLIER * (f.scale || 1)}
          className={`absolute top-0 left-0 border-opacity-70 ${
            f.selected
              ? 'border-4 border-blue-500'
              : f.highlighted
              ? 'border-4 border-yellow-400'
              : ''
          } pointer-events-auto box-content ${
            f.selected || f.highlighted ? 'z-10' : ''
          }`}
          style={{
            imageRendering: 'pixelated',
          }}
          onContextMenu={(e) => {
            setContextMenu(
              <FieldMenu id={f.id} x={e.clientX} y={e.clientY}></FieldMenu>
            );
          }}
          onClick={(e) => {
            if (e.ctrlKey && e.altKey) {
              fields.splice(id, 1);
              setFields(fields.map((f) => f));
              setEditField(undefined);
              return;
            }

            const index = fields.indexOf(f);

            if (!f.selected) setEditField(fields[index]);
            else if (f.selected && e.ctrlKey) setEditField(undefined);

            const selected = f.selected;

            if (!e.ctrlKey)
              fields.forEach((f, i) => {
                fields[i].selected = false;
                fields[i].highlighted = false;
              });
            fields[index].selected = e.ctrlKey ? !selected : true;

            setFields(fields.map((f) => f));
          }}
        />
        {f.image && !f.texture ? (
          <div
            className={`grid place-items-center absolute ${
              f.selected ? 'top-[4px] left-[4px]' : 'top-0 left-0'
            }`}
            style={{
              width: `${f.width * SZ_MULTIPLIER * (f.scale || 1)}px`,
              height: `${f.height * SZ_MULTIPLIER * (f.scale || 1)}px`,
            }}
          >
            <img
              src={f.image.path}
              className={`w-[75px] h-[75px] ${f.selected ? 'z-30' : ''} ${
                !f.image.saturation ? 'saturate-0' : ''
              }`}
              style={{
                opacity: f.image.opacity,
                imageRendering: 'pixelated',
              }}
            />
          </div>
        ) : (
          <></>
        )}
      </div>
    );
  };

  const FieldMenu = (props: { id: number; x: number; y: number }) => {
    const { id, x, y } = props;
    const ref = useClickOutside(() => setContextMenu(undefined));

    useEffect(() => {
      fields[fieldIndex].selected = true;
      setFields(fields.map((f) => f));
    }, []);

    const FieldMenuItem = (props: {
      label: string;
      hotkey: string;
      onClick: (e: React.MouseEvent<HTMLParagraphElement, MouseEvent>) => void;
    }) => {
      const { label, onClick, hotkey } = props;
      return (
        <>
          <p
            className="px-4 py-2 hover:bg-slate-700 rounded-lg flex justify-between w-full"
            onClick={(e) => {
              setContextMenu(undefined);
              onClick(e);
            }}
          >
            <span>{label}</span>
            <span>
              {hotkey.split('+').map((k) => {
                return <Kbd>{k}</Kbd>;
              })}
            </span>
          </p>
        </>
      );
    };

    const FieldMenuDivider = () => {
      return <hr className="mx-4 my-2 opacity-50" />;
    };

    const fieldIndex = fields.indexOf(fields.find((f) => f.id == id));

    return (
      <div
        className="absolute pointer-events-auto bg-slate-800 border-opacity-50 border-white border rounded-lg w-80 h-60 overflow-y-scroll scrollbar"
        style={{ top: y, left: x }}
        ref={ref}
      >
        <FieldMenuItem
          label="Delete"
          onClick={() => {
            fields.splice(fieldIndex, 1);
            setFields(fields.map((f) => f));
          }}
          hotkey={'Backspace'}
        />
        <FieldMenuItem
          label="Clone"
          hotkey="Ctrl+C"
          onClick={() => {
            setFields(fields.map((f) => f));
            cloneFields();
          }}
        />
        <FieldMenuItem
          label="Rename"
          hotkey="Ctrl+W"
          onClick={() => {
            if (fields[fieldIndex]) fields[fieldIndex].rename = true;
            setFields(fields.map((f) => f));
          }}
        />
        <FieldMenuDivider />
        <FieldMenuItem
          label="Move left"
          hotkey="⬅"
          onClick={() => {
            moveSelected('left');
          }}
        />
        <FieldMenuItem
          label="Move right"
          hotkey="➡"
          onClick={() => {
            moveSelected('right');
          }}
        />
        <FieldMenuItem
          label="Move up"
          hotkey="⬆"
          onClick={() => {
            moveSelected('up');
          }}
        />
        <FieldMenuItem
          label="Move down"
          hotkey="⬇"
          onClick={() => {
            moveSelected('down');
          }}
        />
        <FieldMenuItem
          label="Move left 10px"
          hotkey="Shift+⬅"
          onClick={() => {
            moveSelected('left', 10);
          }}
        />
        <FieldMenuItem
          label="Move right 10px"
          hotkey="Shift+➡"
          onClick={() => {
            moveSelected('right', 10);
          }}
        />
        <FieldMenuItem
          label="Move up 10px"
          hotkey="Shift+⬆"
          onClick={() => {
            moveSelected('up', 10);
          }}
        />
        <FieldMenuItem
          label="Move down 10px"
          hotkey="Shift+⬇"
          onClick={() => {
            moveSelected('down', 10);
          }}
        />
        <FieldMenuItem
          label="Move left 100px"
          hotkey="Ctrl+Shift+⬅"
          onClick={() => {
            moveSelected('left', 100);
          }}
        />
        <FieldMenuItem
          label="Move right 100px"
          hotkey="Ctrl+Shift+➡"
          onClick={() => {
            moveSelected('right', 100);
          }}
        />
        <FieldMenuItem
          label="Move up 100px"
          hotkey="Ctrl+Shift+⬆"
          onClick={() => {
            moveSelected('up', 100);
          }}
        />
        <FieldMenuItem
          label="Move down 100px"
          hotkey="Ctrl+Shift+⬇"
          onClick={() => {
            moveSelected('down', 100);
          }}
        />
      </div>
    );
  };

  const Main = () => {
    return (
      <div className="bg-gray-200 dark:bg-gray-800 text-neutral-900 dark:text-white w-screen min-h-[calc(100vh-12rem/4)]">
        <div className="grid grid-cols-6 h-[calc(100vh-12rem/4)]">
          <div className="fieldList bg-gray-200 dark:bg-gray-800 col-span-1 w-full h-[calc(100vh-12rem/4)] overflow-y-auto scrollbar">
            {fields.length > 0 ? (
              <>
                {fields.map((f) => {
                  return (
                    <FieldText
                      name={f.name}
                      id={f.id}
                      field={f}
                      key={`field text ${f.id}`}
                    ></FieldText>
                  );
                })}
              </>
            ) : (
              <div className="opacity-75 grid place-items-center h-[calc(100vh-12rem/4)] text-center">
                <div className="px-4">
                  <h2 className="text-2xl">No fields</h2>
                  <p>
                    There are no fields on the GUI. You can add some by
                    shift-clicking the GUI you want to add a field.
                  </p>
                  <p className="text-sm">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>Alt</Kbd>
                    <Kbd>S</Kbd> for hotkeys
                  </p>
                </div>
              </div>
            )}
          </div>
          <div
            ref={guiEditor}
            className="guiEditor bg-gray-100 dark:bg-gray-900 col-span-4 w-full h-[calc(100vh-12rem/4)] overflow-scroll relative scrollbar"
          >
            <div className="h-[calc(100vh-12rem/4)] w-full grid place-items-center">
              <div
                onClick={(e) => {
                  const boundingRect = e.currentTarget.getBoundingClientRect();

                  const [mouseX, mouseY] = [
                    e.clientX - boundingRect.left,
                    e.clientY - boundingRect.top,
                  ];

                  if (!e.shiftKey) {
                    let fieldClicked = false;
                    fields.forEach((f) => {
                      if (
                        mouseX > f.x &&
                        mouseX <
                          f.x + f.width * SZ_MULTIPLIER * (f.scale || 1) &&
                        mouseY > f.y &&
                        mouseY < f.y + f.height * SZ_MULTIPLIER * (f.scale || 1)
                      ) {
                        fieldClicked = true;
                        return;
                      }
                    });

                    if (fieldClicked === false) {
                      setEditField(undefined);
                      setFields(
                        fields.map((f) => {
                          f.selected = false;
                          f.highlighted = false;
                          return f;
                        })
                      );
                    }

                    return;
                  }

                  setFieldIndex(fieldIndex + 1);

                  const field: Field = {
                    x: Math.round(mouseX),
                    y: Math.round(mouseY),
                    name: `field ${fieldIndex + 1}`,
                    selected: true,
                    highlighted: false,
                    id: fieldIndex + 1,
                    rename: false,
                    height: 18,
                    width: 18,
                  };

                  setFields([
                    ...fields.map((f) => {
                      f.selected = false;
                      f.highlighted = false;
                      return f;
                    }),
                    field,
                  ]);

                  setEditField(field);
                }}
              >
                <img
                  ref={guiImg}
                  draggable={false}
                  src={getResourcePath('minecraft_inv_default.png')}
                  style={{
                    minWidth: '960px',
                    maxWidth: '960px',
                    imageRendering: 'pixelated',
                  }}
                />
                <div className="absolute top-0 left-0 w-full h-[calc(100vh-12rem/4)] pointer-events-none">
                  {fields.map((f, i) => (
                    <Field field={f} id={i} key={i}></Field>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div
            className={`fieldProperties bg-gray-300 dark:bg-gray-700 px-6 col-span-1 w-full h-[calc(100vh-12rem/4)] overflow-y ${
              !editField ? 'grid place-items-center' : ''
            } overflow-x-hidden overflow-y-auto max-w-full`}
          >
            {editField ? (
              <div>
                <h1 className="text-2xl">Edit {editField.name}</h1>
                <hr className="my-6 opacity-50" />
                <Accordion
                  styles={{
                    control: {
                      ':hover': {
                        backgroundColor: '#2c2e3333',
                      },
                    },
                  }}
                  multiple
                  initialItem={0}
                  iconPosition="right"
                >
                  <Accordion.Item label="Position">
                    <NumberInput
                      value={editField.x}
                      min={0}
                      max={
                        guiImg.current.offsetWidth -
                        editField.width * SZ_MULTIPLIER * (editField.scale || 1)
                      }
                      onBlur={(e) => {
                        const i = fields.indexOf(editField);
                        const val = parseInt(e.currentTarget.value);
                        editField.x =
                          val >= 0 &&
                          val <=
                            guiImg.current.offsetWidth -
                              editField.width *
                                SZ_MULTIPLIER *
                                (editField.scale || 1)
                            ? val
                            : val < 0
                            ? 0
                            : guiImg.current.offsetWidth -
                              editField.width *
                                SZ_MULTIPLIER *
                                (editField.scale || 1);
                        setFields(
                          fields.map((f, index) => {
                            if (index == i) {
                              return editField;
                            }
                            return f;
                          })
                        );
                      }}
                      variant={'default'}
                      classNames={{
                        input: 'bg-black bg-opacity-25 rounded-md',
                        control: 'bg-black bg-opacity-25',
                      }}
                      icon={<>x</>}
                    />
                    <div className="my-2" />
                    <NumberInput
                      value={editField.y}
                      min={0}
                      max={
                        guiImg.current.offsetHeight -
                        editField.height *
                          SZ_MULTIPLIER *
                          (editField.scale || 1)
                      }
                      onBlur={(e) => {
                        const i = fields.indexOf(editField);
                        const val = parseInt(e.currentTarget.value);
                        editField.y =
                          val >= 0 &&
                          val <=
                            guiImg.current.offsetHeight -
                              editField.height *
                                SZ_MULTIPLIER *
                                (editField.scale || 1)
                            ? val
                            : val < 0
                            ? 0
                            : guiImg.current.offsetHeight -
                              editField.height *
                                SZ_MULTIPLIER *
                                (editField.scale || 0);
                        setFields(
                          fields.map((f, index) => {
                            if (index == i) {
                              return editField;
                            }
                            return f;
                          })
                        );
                      }}
                      variant={'default'}
                      classNames={{
                        input: 'bg-black bg-opacity-25 rounded-md',
                        control: 'bg-black bg-opacity-25',
                      }}
                      icon={<>y</>}
                    />
                  </Accordion.Item>
                  <Accordion.Item label="Size">
                    <Slider
                      min={0.25}
                      max={4}
                      label="Scale"
                      marks={[
                        { value: 0.5, label: 'x0.5' },
                        { value: 1, label: 'x1' },
                        { value: 1.5, label: 'x1.5' },
                        { value: 2, label: 'x2' },
                        { value: 2.5, label: 'x2.5' },
                        { value: 3, label: 'x3' },
                        { value: 3.5, label: 'x3.5' },
                        { value: 4, label: 'x4' },
                      ]}
                      step={0.1}
                      value={editField.scale || 1}
                      onChange={(v) => {
                        editField.scale = v;
                        const fieldIndex = fields.indexOf(editField);
                        fields[fieldIndex].scale = v;
                        setFields(fields.map((f) => f));
                      }}
                    />
                    <NumberInput
                      label="Scale"
                      value={editField.scale || 1}
                      onChange={(v) => {
                        const fieldIndex = fields.indexOf(editField);
                        fields[fieldIndex].scale = v;
                        setFields(fields.map((f) => f));
                      }}
                      step={0.1}
                      min={0.1}
                      max={10}
                      precision={2}
                    />
                  </Accordion.Item>
                  <Accordion.Item label="Item texture">
                    {editField.texture && (
                      <Alert
                        icon={<IconAlertCircle />}
                        title="Warning!"
                        color="red"
                      >
                        Info: Item textures are only supported for standard
                        fields (Fields without a field texture)
                      </Alert>
                    )}
                    <p>
                      Select an item texture to display over the slot texture.
                      Is useful to show the user which item or item type to put
                      in the slot.
                    </p>
                    {editField.image ? (
                      <>
                        <Button
                          variant="outline"
                          color="red"
                          onClick={() => {
                            const fieldIndex = fields.indexOf(editField);
                            fields[fieldIndex].image = undefined;
                            setFields(fields.map((f) => f));
                          }}
                        >
                          Remove
                        </Button>
                        <div className="my-4" />
                        <Slider
                          defaultValue={editField.image.opacity}
                          step={0.05}
                          min={0}
                          max={1}
                          marks={[
                            { value: 0, label: '0%' },
                            { value: 0.5, label: '50%' },
                            { value: 1, label: '100%' },
                          ]}
                          label={(v) => `${Math.floor(v * 100)}%`}
                          onChangeEnd={(e) => {
                            const i = fields.indexOf(editField);
                            fields[i].image.opacity = e;
                            setFields(fields.map((f) => f));
                          }}
                        />
                        <div className="my-8" />
                        <Switch
                          label="Saturation"
                          defaultChecked={editField.image.saturation}
                          onChange={(e) => {
                            const i = fields.indexOf(editField);
                            fields[i].image.saturation =
                              e.currentTarget.checked;
                            setFields(fields.map((f) => f));
                          }}
                        />
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLoadingOverlay(true);
                          Api.openItemTexture().then((file) => {
                            setLoadingOverlay(false);
                            if (!file) return;
                            const fieldIndex = fields.indexOf(editField);
                            fields[fieldIndex].image = {
                              opacity: 1.0,
                              path: file,
                              saturation: true,
                            };
                            setFields(fields.map((f) => f));
                          });
                        }}
                        disabled={!!editField.texture}
                      >
                        Load image!
                      </Button>
                    )}
                  </Accordion.Item>
                  <Accordion.Item label="Field texture">
                    <p>
                      Select the field texture (slot texture). This is useful
                      when you want to have bigger fields than 16x16.
                    </p>
                    {editField.texture ? (
                      <Button
                        variant="outline"
                        color="red"
                        onClick={() => {
                          const fieldIndex = fields.indexOf(editField);
                          fields[fieldIndex].texture = undefined;
                          fields[fieldIndex].width = 18;
                          fields[fieldIndex].height = 18;
                          setFields(fields.map((f) => f));
                        }}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLoadingOverlay(true);
                          Api.openItemTexture().then((file) => {
                            setLoadingOverlay(false);
                            if (!file) return;
                            const fieldIndex = fields.indexOf(editField);
                            fields[fieldIndex].texture = file;
                            getImageSizes(file).then(({ width, height }) => {
                              fields[fieldIndex].width = width;
                              fields[fieldIndex].height = height;
                              setFields(fields.map((f) => f));
                            });
                          });
                        }}
                      >
                        Load image!
                      </Button>
                    )}
                  </Accordion.Item>
                </Accordion>
              </div>
            ) : (
              <div className="opacity-75 text-center">
                <h1 className="text-2xl">Nothing here...</h1>
                <p>Select one element to get started!</p>
                <p className="text-sm">
                  Multiple elements aren't supported at this moment.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute pointer-events-none top-0 left-0 w-full h-full">
          {contextMenu}
        </div>
      </div>
    );
  };

  const Start = () => {
    useEffect(() => {
      Api.getRecent().then(setRecent);
    }, []);
    return (
      <div className="bg-gray-200 dark:bg-gray-800 text-neutral-900 dark:text-white w-screen min-h-[calc(100vh-12rem/4)] grid place-items-center">
        <div className="w-5/6 h-5/6 drop-shadow-lg mb-28">
          <div className="grid grid-cols-6 h-[calc(100vh-12rem/4)]">
            <div className="col-span-1 bg-gray-100 dark:bg-gray-700 p-4 rounded-l-lg">
              <div
                className="opacity-75 hover:opacity-100 transition-opacity duration-100 cursor-pointer"
                onClick={() => {
                  setScreen('editor');
                  Api.setEditorRpc();
                  setDocTitle('Unknown - Graintfa');
                }}
              >
                <h1 className="text-2xl">
                  <IconPlus className="inline" /> Create new
                </h1>
                <p>Create a new blank GUI file</p>
              </div>
              <div className="my-4"></div>
              <div
                className="opacity-75 hover:opacity-100 transition-opacity duration-100 cursor-pointer"
                onClick={() => {
                  openFile();
                }}
              >
                <h1 className="text-2xl">
                  <IconFolder className="inline" /> Open
                </h1>
                <p>Open an existing Graintfa file</p>
              </div>
              <div className="my-4"></div>
              <div
                className="opacity-75 hover:opacity-100 transition-opacity duration-100 cursor-pointer"
                onClick={() => {
                  openSettings();
                }}
              >
                <h1 className="text-2xl">
                  <IconSettings className="inline" /> Settings
                </h1>
                <p>Set up stuff</p>
              </div>
              <div className="my-4"></div>
              <div
                className="opacity-75 hover:opacity-100 transition-opacity duration-100 cursor-pointer"
                onClick={() => {
                  openHotkeys();
                }}
              >
                <h1 className="text-2xl">
                  <IconKeyboard className="inline" /> Hotkeys
                </h1>
                <p>View all keyboard shortcuts</p>
              </div>
            </div>
            <div className="col-span-5 bg-gray-200 dark:bg-gray-600 p-4 rounded-r-lg overflow-y-auto scrollbar">
              <h1 className="text-3xl">Graintfa</h1>
              <hr className="opacity-25 my-4" />
              {recent.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {recent.reverse().map((f, i) => {
                    const fileName = f.split('\\').pop();
                    return (
                      <Tooltip label={f} withArrow color={'gray'} key={i}>
                        <p
                          className="px-4 py-2 bg-gray-400 dark:bg-slate-800 opacity-75 hover:opacity-100 rounded-md transition-all duration-200 cursor-pointer"
                          onClick={() => {
                            openFile(f);
                          }}
                        >
                          {fileName}
                        </p>
                      </Tooltip>
                    );
                  })}
                </div>
              ) : (
                <div className="opacity-50 h-full text-center">
                  <div>
                    <h2 className="text-2xl">No recent files</h2>
                    <p>Why don't you create or open one?</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const askForClose = (
    f: () => void,
    title = 'Are you sure you want to close?',
    children = <>Unsaved changes will be lost!</>
  ) => {
    modals.openConfirmModal({
      title: title,
      children: children,
      id: 'close',
      labels: {
        cancel: 'No',
        confirm: 'Yes',
      },
      withCloseButton: false,
      confirmProps: { color: 'green', variant: 'outline' },
      cancelProps: { color: 'red', variant: 'outline' },
      onConfirm() {
        f();
      },
    });
  };

  const askForSave = () => {
    askForClose(
      () => {
        window.location.reload();
      },
      'Reload?',
      <>
        Graintfa needs to reload to apply all changes. Unsaved changes will be
        lost. Do you want to continue? You can also reload manually.
      </>
    );
  };

  const askForOpen = () => {
    if (screen == 'start') return openFile();
    askForClose(
      () => {
        openFile();
      },
      'Open file?',
      <>Unsaved changes will be lost.</>
    );
  };

  const askForReload = () => {
    if (screen == 'start') return window.location.reload();
    askForClose(
      () => {
        window.location.reload();
      },
      'Reload?',
      <>Unsaved changes will be lost.</>
    );
  };

  const fetchSettings = () => Api.getSettings().then(setSettings);
  const openSettings = () => {
    fetchSettings();
    modals.openModal({
      id: 'settings',
      size: 'full',
      classNames: {
        modal: 'h-3/4',
      },
      children: (
        <>
          <h1>
            <IconSettings className="inline" /> Settings
          </h1>
          <hr className="my-4 opacity-50" />
          <Tabs
            color="cyan"
            orientation="vertical"
            classNames={{ body: 'w-[90%]' }}
            tabPadding="xl"
          >
            <Tabs.Tab label="General" icon={<IconDots />}>
              <Divider
                my="xs"
                label={
                  <>
                    <IconBrush size={12} /> <p className="ml-2">Theme</p>
                  </>
                }
                labelPosition="center"
              />

              <Select
                label="Theme"
                defaultValue={settings.theme}
                data={[
                  { value: 'dark', label: 'Dark mode' },
                  { value: 'light', label: 'Light mode' },
                ]}
                onChange={(e) => {
                  setSettings((s) => {
                    if (e != 'light' && e != 'dark') return;
                    s.theme = e;
                    Api.setSettings(s);
                    return s;
                  });
                }}
              />
              <div className="my-2" />
              <Button
                color="green"
                variant="outline"
                onClick={() => {
                  askForSave();
                }}
              >
                Apply
              </Button>

              <Divider
                my="xs"
                label={
                  <>
                    <IconFile size={12} /> <p className="ml-2">Recent files</p>
                  </>
                }
                labelPosition="center"
              />

              <Button
                variant="outline"
                onClick={() => {
                  Api.clearRecent();
                  setRecent([]);
                  showNotification({
                    message: 'Cleared recent files!',
                    color: 'green',
                  });
                }}
              >
                Clear recent files
              </Button>

              <Divider
                my="xs"
                label={
                  <>
                    <IconAlertTriangle size={12} />{' '}
                    <p className="ml-2">Danger zone</p>
                  </>
                }
                labelPosition="center"
              />

              <Button
                variant="outline"
                color="red"
                onClick={() => {
                  Api.clearRecent();
                  setRecent([]);
                  setSettings((s) => {
                    s = undefined;
                    Api.defaultSettings();
                    askForClose(
                      () => {
                        window.location.reload();
                      },
                      'Reload?',
                      <>Unsaved changes will be lost.</>
                    );
                    return s;
                  });
                }}
              >
                Reset settings to default
              </Button>
            </Tabs.Tab>
            <Tabs.Tab label="Nav" icon={<IconLayoutNavbar />}>
              <Divider
                my="xs"
                label={
                  <>
                    <IconEye size={12} /> <p className="ml-2">Appearance</p>
                  </>
                }
                labelPosition="center"
              />
              <Switch
                label="Keep nav opened"
                defaultChecked={
                  settings?.keepNavOpen != undefined
                    ? settings.keepNavOpen
                    : false
                }
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  setSettings((s) => {
                    s.keepNavOpen = on;
                    Api.setSettings(s);
                    return s;
                  });
                }}
              />
              <div className="my-2" />
              <Switch
                label="Center nav"
                defaultChecked={
                  settings?.centerNav != undefined ? settings.centerNav : false
                }
                onChange={(e) => {
                  const on = e.currentTarget.checked;
                  setSettings((s) => {
                    s.centerNav = on;
                    Api.setSettings(s);
                    return s;
                  });
                }}
              />
            </Tabs.Tab>
          </Tabs>
        </>
      ),
    });
  };

  const screens = {
    start: Start(),
    editor: Main(),
  };

  const Nav = () => {
    const keepNavOpen =
      settings?.keepNavOpen != undefined ? settings.keepNavOpen : false;
    const centerNav =
      settings?.centerNav != undefined ? settings.centerNav : false;

    const [navOpened, setNavOpened] = useState(keepNavOpen);

    const containerTransition: Transition = !keepNavOpen
      ? { staggerChildren: 0.1 }
      : {};

    const container: Variants = {
      show: {
        opacity: 1,
        transition: containerTransition,
      },
      exit: {
        transition: containerTransition,
      },
    };

    const itemTransition: Transition = !keepNavOpen
      ? {
          type: 'spring',
          stiffness: 50,
          mass: 0.75,
        }
      : {
          duration: 0,
          ease: 'linear',
        };

    const item: Variants = !keepNavOpen
      ? {
          hidden: { opacity: 0, y: 200 },
          show: {
            opacity: 1,
            y: 0,
            transition: itemTransition,
          },
          exit: { opacity: 0, y: 200, transition: itemTransition },
        }
      : {
          hidden: { opacity: 1, y: 0 },
          show: {
            opacity: 1,
            y: 0,
            transition: itemTransition,
          },
          exit: { opacity: 1, y: 0, transition: itemTransition },
        };

    const controls: {
      icon: ReactNode;
      label: string;
      disabled: boolean;
      hotkey?: string;
      click: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    }[] = [
      {
        icon: <IconPlus />,
        label: 'Create new',
        hotkey: 'Ctrl+N',
        disabled: screen != 'start',
        click: () => {
          setFields([]);
          setScreen('editor');
        },
      },
      {
        icon: <IconReplace />,
        label: 'Rerender',
        hotkey: 'F2',
        disabled: screen != 'editor',
        click: () => {
          setFields(fields.map((f) => f));
        },
      },
      {
        icon: <IconScan />,
        label: 'Render',
        hotkey: 'F12',
        disabled: screen != 'editor',
        click: () => {
          renderGUI();
        },
      },
      {
        icon: <IconHome />,
        label: 'Start screen',
        hotkey: 'Ctrl+H',
        disabled: false,
        click: () => {
          openHomeScreen();
        },
      },
      {
        icon: <IconDeviceFloppy />,
        label: 'Save',
        hotkey: 'Ctrl+S',
        disabled: screen != 'editor',
        click: () => {
          saveFile(file);
        },
      },
      {
        icon: <IconFolder />,
        label: 'Open',
        hotkey: 'Ctrl+O',
        disabled: false,
        click: () => {
          askForOpen();
        },
      },
      {
        icon: <IconSettings />,
        label: 'Settings',
        hotkey: 'Ctrl+,',
        disabled: false,
        click: () => {
          openSettings();
        },
      },
      {
        icon: <IconRefresh />,
        label: 'Refresh',
        disabled: false,
        click: () => {
          askForReload();
        },
      },
      {
        icon: <IconKeyboard />,
        label: 'Hotkeys',
        hotkey: 'Ctrl+Alt+S',
        disabled: false,
        click: () => {
          openHotkeys();
        },
      },
    ];

    return (
      <div
        className={`w-full h-12 bg-gray-400 dark:bg-gray-800 fixed bottom-0 left-0 z-80 backdrop-blur-lg ${
          navOpened
            ? 'bg-gray-300 dark:bg-gray-700'
            : 'hover:bg-gray-300 dark:hover:bg-gray-700'
        } transition-opacity duration-100 text-neutral-900 dark:text-white group`}
      >
        <div
          className={`w-full h-[calc(100vh-12rem/4)] flex flex-row ${
            centerNav ? 'justify-center' : ''
          } gap-4`}
        >
          <div
            onClick={() => {
              if (keepNavOpen) return;
              setNavOpened((o) => !o);
            }}
            className={`${!keepNavOpen ? 'cursor-pointer' : ''}`}
          >
            <img
              src={getResourcePath('logo_white.svg')}
              className="h-12 w-12 hidden dark:inline"
            />
            <img
              src={getResourcePath('logo_black.svg')}
              className="h-12 w-12 inline dark:hidden"
            />
            {!keepNavOpen ? (
              <IconChevronRight
                className={`transition-all duration-200 ease-in-out my-auto inline ${
                  navOpened ? 'rotate-180' : 'opacity-0 group-hover:opacity-100'
                }`}
              />
            ) : (
              <></>
            )}
          </div>
          <AnimatePresence>
            {navOpened ? (
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                exit="exit"
                className="flex flex-row"
              >
                {controls
                  .sort((a, b) => (a.label > b.label ? 1 : -1))
                  .map((c, i) => {
                    return (
                      <Tooltip
                        key={i}
                        className="cursor-pointer"
                        label={`${c.label}${c.hotkey ? ` (${c.hotkey})` : ''}`}
                        onClick={(e) => {
                          if (c.disabled) return;
                          c.click(e);
                          if (keepNavOpen) return;
                          setNavOpened(false);
                        }}
                        withArrow
                      >
                        <motion.div
                          variants={item}
                          className={`w-12 h-12 ${
                            c.disabled
                              ? 'opacity-50 text-neutral-600 dark:text-neutral-400'
                              : 'hover:bg-gray-300 dark:hover:bg-gray-800'
                          } grid place-items-center transition-colors duration-100`}
                        >
                          {c.icon}
                        </motion.div>
                      </Tooltip>
                    );
                  })}
              </motion.div>
            ) : (
              ''
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <>
      {loadingOverlay ? (
        <div className="grid place-items-center absolute w-full top-0 left-0">
          {/* <Button
            color="red"
            className="z-50 mt-10"
            onClick={() => {
              setLoadingOverlay(false);
            }}
          >
            Cancel
          </Button> */}
        </div>
      ) : (
        <></>
      )}
      <LoadingOverlay visible={loadingOverlay} zIndex={49} />
      <div className="h-[calc(100vh-12rem/4)] w-full bg-gray-200 dark:bg-gray-900 overflow-hidden">
        <div
          className="titleBar h-8 w-full bg-slate-300 dark:bg-slate-700 flex flex-row justify-between text-black dark:text-white text-center"
          ref={titleBar}
        >
          <img
            src={getResourcePath('logo_white.svg')}
            className="h-8 w-8 hidden dark:inline opacity-50"
          />
          <img
            src={getResourcePath('logo_black.svg')}
            className="h-8 w-8 inline dark:hidden opacity-50"
          />
          <div className="my-auto w-full title-bar-drag">{docTitle}</div>
          <div className="flex flex-row cursor-pointer">
            <div
              className="h-full px-2 bg-white bg-opacity-0 hover:bg-opacity-25 transition-all duration-100"
              onClick={Api.minmize}
            >
              <IconMinus className="my-auto h-full" />
            </div>
            <div
              className="h-full px-2 bg-white bg-opacity-0 hover:bg-opacity-25 transition-all duration-100"
              onClick={Api.maximize}
            >
              <IconBoxMultiple className="my-auto h-full" />
            </div>
            <div
              className="h-full px-2 bg-[#ff3434] bg-opacity-0 hover:bg-opacity-100 transition-all duration-100"
              onClick={() => {
                if (screen === 'editor') askForClose(Api.close);
                else Api.close();
              }}
            >
              <IconX className="my-auto h-full" />
            </div>
          </div>
        </div>
        <AnimatePresence initial={false} exitBeforeEnter>
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            transition={{
              duration: 0.3,
            }}
          >
            {screens[screen]}
          </motion.div>
        </AnimatePresence>
        <Nav />
      </div>
    </>
  );
};

const Wrappers = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    Api.getTheme().then(setTheme);
  }, []);

  return (
    <MantineProvider
      theme={{ colorScheme: theme, loader: 'bars', primaryColor: 'cyan' }}
    >
      <ModalsProvider>
        <NotificationsProvider>
          <div className={`${theme} select-none`}>
            <App />
          </div>
        </NotificationsProvider>
      </ModalsProvider>
    </MantineProvider>
  );
};

export default Wrappers;
