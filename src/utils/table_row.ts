import { Table } from "apache-arrow";

export type TableRow = Record<string, unknown>;

function isRecord(value: unknown): value is TableRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLink(
  row: TableRow,
): row is TableRow & { from_uid: unknown; to_uid: unknown; reltype: unknown } {
  return (
    row.from_uid !== undefined &&
    row.to_uid !== undefined &&
    row.reltype !== undefined
  );
}

function isNode(row: TableRow): row is TableRow & { uid: unknown } {
  return row.uid !== undefined;
}

export function rowsFromResult<T = TableRow>(res: Table): T[] {
  return res.toArray().map((r) => r.toJSON() as T);
}

export function categorizeTableRows(rows: TableRow[]): {
  nodeRows: TableRow[];
  linkRows: TableRow[];
} {
  const nodes = new Map<string, TableRow>();
  const links = new Map<string, TableRow>();

  const addCandidate = (candidate: unknown) => {
    if (!isRecord(candidate)) {
      console.warn("Skipping non-record candidate:", candidate);
    } else if (isLink(candidate)) {
      const key = `${candidate.from_uid}:${candidate.to_uid}:${candidate.reltype}`;
      links.set(key, candidate);
    } else if (isNode(candidate)) {
      nodes.set(String(candidate.uid), candidate);
    }
  };

  for (const row of rows) {
    addCandidate(row);

    for (const value of Object.values(row)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          addCandidate(item);
        }
      } else {
        addCandidate(value);
      }
    }
  }

  return {
    nodeRows: Array.from(nodes.values()),
    linkRows: Array.from(links.values()),
  };
}
