import { buildTree } from './tree.util';

describe('buildTree', () => {
  it('returns empty array untuk input kosong', () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it('membuat root nodes untuk item tanpa parentId', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: null },
    ];
    const result = buildTree(items);
    expect(result).toHaveLength(2);
    expect(result[0]!.item.id).toBe('1');
    expect(result[1]!.item.id).toBe('2');
  });

  it('membuat children nodes dengan benar', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '1' },
    ];
    const result = buildTree(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.item.id).toBe('1');
    expect(result[0]!.children).toHaveLength(2);
    expect(result[0]!.children[0]!.item.id).toBe('2');
    expect(result[0]!.children[1]!.item.id).toBe('3');
  });

  it('item dengan parentId yang tidak ada → jadi root', () => {
    const items = [
      { id: '1', parentId: 'NONEXISTENT' },
    ];
    const result = buildTree(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.item.id).toBe('1');
    expect(result[0]!.children).toHaveLength(0);
  });

  it('membuat multi-level tree dengan benar', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
      { id: '3', parentId: '2' },
    ];
    const result = buildTree(items);
    expect(result).toHaveLength(1);
    expect(result[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]!.children).toHaveLength(1);
    expect(result[0]!.children[0]!.children[0]!.item.id).toBe('3');
  });

  it('bekerja dengan extra properties', () => {
    const items = [
      { id: '1', parentId: null, name: 'Root', code: 'A' },
      { id: '2', parentId: '1', name: 'Child', code: 'B' },
    ];
    const result = buildTree(items);
    expect(result[0]!.item.name).toBe('Root');
    expect(result[0]!.children[0]!.item.code).toBe('B');
  });

  it('multiple roots dengan children', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: null },
      { id: '3', parentId: '1' },
      { id: '4', parentId: '2' },
    ];
    const result = buildTree(items);
    expect(result).toHaveLength(2);
    expect(result[0]!.children).toHaveLength(1);
    expect(result[1]!.children).toHaveLength(1);
  });
});
