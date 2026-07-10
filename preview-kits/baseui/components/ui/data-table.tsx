import * as React from "react"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ColumnDef<TData> = {
  accessorKey?: keyof TData | string
  header?: React.ReactNode | ((column: ColumnDef<TData>) => React.ReactNode)
  cell?: (row: TData) => React.ReactNode
}

function DataTable<TData>({
  columns = [],
  data = [],
  caption,
  emptyMessage = "No results.",
  className,
}: {
  columns?: Array<ColumnDef<TData>>
  data?: Array<TData>
  caption?: React.ReactNode
  emptyMessage?: React.ReactNode
  className?: string
}) {
  return (
    <Table className={className}>
      {caption ? <TableCaption>{caption}</TableCaption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column, index) => (
            <TableHead key={String(column.accessorKey ?? index)}>
              {typeof column.header === "function"
                ? column.header(column)
                : column.header ?? String(column.accessorKey ?? "")}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length ? (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column, columnIndex) => {
                const value =
                  column.accessorKey == null
                    ? undefined
                    : (row as Record<string, React.ReactNode>)[
                        String(column.accessorKey)
                      ]

                return (
                  <TableCell key={String(column.accessorKey ?? columnIndex)}>
                    {column.cell ? column.cell(row) : value}
                  </TableCell>
                )
              })}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={Math.max(columns.length, 1)}>
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export {
  DataTable,
  type ColumnDef,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
}
