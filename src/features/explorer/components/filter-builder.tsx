"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DatasetField } from "@/lib/api/types";
import { formatConditionInputValue } from "@/features/search/urlSearchConfig";
import {
  type SearchCondition,
  type SearchField,
  type SearchOperator,
  type SearchValue,
  searchableFields,
} from "@/features/search/types";

type ValueKind = "text" | "number" | "date";

const numericAndDateOperators: SearchOperator[] = [
  "eq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "in",
];
const textOperators: SearchOperator[] = ["eq", "contains", "in"];

function isSupportedField(fieldName: string): fieldName is SearchField {
  return searchableFields.some((field) => field === fieldName);
}

function getValueKind(field: DatasetField): ValueKind {
  const dataType = field.dataType.toLowerCase();
  if (
    field.name === "revenue" ||
    /number|numeric|decimal|integer|int/.test(dataType)
  ) {
    return "number";
  }
  if (field.name === "created_at" || /date|time/.test(dataType)) {
    return "date";
  }
  return "text";
}

function getOperators(field: DatasetField): SearchOperator[] {
  return getValueKind(field) === "text"
    ? textOperators
    : numericAndDateOperators;
}

function emptyValue(operator: SearchOperator): SearchValue {
  if (operator === "between") {
    return ["", ""];
  }
  if (operator === "in") {
    return [];
  }
  return "";
}

function getRawValues(condition: SearchCondition): string[] {
  if (condition.operator === "between") {
    return Array.isArray(condition.value)
      ? condition.value.map(String)
      : ["", ""];
  }
  return [formatConditionInputValue(condition.value)];
}

function parseScalar(kind: ValueKind, rawValue: string): string | number {
  if (kind === "number" && rawValue.trim().length > 0) {
    const numberValue = Number(rawValue);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }
  return rawValue;
}

function parseInputValues(
  kind: ValueKind,
  operator: SearchOperator,
  rawValues: string[],
): SearchValue {
  const rawValue = rawValues[0] ?? "";
  if (operator === "between") {
    return [
      parseScalar(kind, rawValues[0] ?? ""),
      parseScalar(kind, rawValues[1] ?? ""),
    ];
  }
  if (operator === "in") {
    if (!rawValue.trim()) {
      return [];
    }
    return rawValue.split(",").map((value) => parseScalar(kind, value.trim()));
  }
  return parseScalar(kind, rawValue);
}

function ConditionRow({
  condition,
  fields,
  index,
  onChange,
  onRemove,
}: {
  condition: SearchCondition;
  fields: DatasetField[];
  index: number;
  onChange: (index: number, condition: SearchCondition) => void;
  onRemove: (index: number) => void;
}) {
  const field = fields.find(({ name }) => name === condition.field);
  const fallbackField = fields[0];
  const activeField = field ?? fallbackField;
  const kind = activeField ? getValueKind(activeField) : "text";
  const operators = activeField ? getOperators(activeField) : textOperators;
  const operator = operators.includes(condition.operator)
    ? condition.operator
    : operators[0];
  const [localRawValues, setLocalRawValues] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const rawValues = isEditing ? localRawValues : getRawValues(condition);

  function changeField(fieldName: string) {
    const nextField = fields.find(({ name }) => name === fieldName);
    if (!nextField || !isSupportedField(nextField.name)) {
      return;
    }

    const nextOperator = getOperators(nextField)[0];
    const nextCondition: SearchCondition = {
      field: nextField.name,
      operator: nextOperator,
      value: emptyValue(nextOperator),
    };
    setLocalRawValues(getRawValues(nextCondition));
    onChange(index, nextCondition);
  }

  function changeOperator(nextOperator: SearchOperator) {
    const nextCondition: SearchCondition = {
      ...condition,
      operator: nextOperator,
      value: emptyValue(nextOperator),
    };
    setLocalRawValues(getRawValues(nextCondition));
    onChange(index, nextCondition);
  }

  function changeValue(valueIndex: number, value: string) {
    const nextRawValues = [...rawValues];
    nextRawValues[valueIndex] = value;
    setLocalRawValues(nextRawValues);

    const nextValue = parseInputValues(kind, operator, nextRawValues);
    const nextCondition: SearchCondition = {
      ...condition,
      operator,
      value: nextValue,
    };
    onChange(index, nextCondition);
  }

  const inputType =
    kind === "number" ? "number" : kind === "date" ? "date" : "text";
  const inputMode = kind === "number" ? "decimal" : undefined;
  const valueInputClass =
    "h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-500";

  return (
    <fieldset
      className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(140px,0.8fr)_minmax(240px,2fr)_auto] sm:items-end"
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setIsEditing(false);
        }
      }}
      onFocusCapture={() => {
        if (!isEditing) {
          setLocalRawValues(getRawValues(condition));
          setIsEditing(true);
        }
      }}
    >
      <legend className="px-1 text-xs font-medium text-slate-500">
        Condition {index + 1}
      </legend>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        Field
        <select
          aria-label={`Condition ${index + 1} field`}
          className={valueInputClass}
          onChange={(event) => changeField(event.currentTarget.value)}
          value={condition.field}
        >
          {fields
            .filter(
              ({ isFilterable, name }) =>
                isFilterable && isSupportedField(name),
            )
            .map((option) => (
              <option key={option.id} value={option.name}>
                {option.label}
              </option>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-600">
        Operator
        <select
          aria-label={`Condition ${index + 1} operator`}
          className={valueInputClass}
          onChange={(event) => {
            const nextOperator = operators.find(
              (option) => option === event.currentTarget.value,
            );
            if (nextOperator) {
              changeOperator(nextOperator);
            }
          }}
          value={operator}
        >
          {operators.map((option) => (
            <option key={option} value={option}>
              {option === "eq"
                ? "equals"
                : option === "gte"
                  ? "at least"
                  : option === "gt"
                    ? "greater than"
                    : option === "lte"
                      ? "at most"
                      : option === "lt"
                        ? "less than"
                        : option === "between"
                          ? "between"
                          : option === "in"
                            ? "is one of"
                            : "contains"}
            </option>
          ))}
        </select>
      </label>
      <div className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
        <span>Value</span>
        {operator === "between" ? (
          <div className="grid grid-cols-2 gap-2">
            {rawValues.slice(0, 2).map((value, valueIndex) => (
              <label
                className="flex flex-col gap-1 text-xs font-normal text-slate-500"
                key={valueIndex}
              >
                {valueIndex === 0 ? "Minimum value" : "Maximum value"}
                <input
                  aria-label={`Condition ${index + 1} ${valueIndex === 0 ? "minimum" : "maximum"} value`}
                  className={valueInputClass}
                  inputMode={inputMode}
                  onChange={(event) =>
                    changeValue(valueIndex, event.currentTarget.value)
                  }
                  type={inputType}
                  value={value}
                />
              </label>
            ))}
          </div>
        ) : (
          <input
            aria-label={`Condition ${index + 1} value`}
            className={valueInputClass}
            inputMode={inputMode}
            onChange={(event) => changeValue(0, event.currentTarget.value)}
            placeholder={
              operator === "in"
                ? "Separate values with commas"
                : kind === "number"
                  ? "Enter a number"
                  : kind === "date"
                    ? "Choose a date"
                    : "Enter a value"
            }
            type={operator === "in" ? "text" : inputType}
            value={rawValues[0] ?? ""}
          />
        )}
      </div>
      <button
        aria-label={`Remove condition ${index + 1}`}
        className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950"
        onClick={() => onRemove(index)}
        type="button"
      >
        <X aria-hidden="true" className="size-4" />
        <span className="sm:sr-only">Remove</span>
      </button>
    </fieldset>
  );
}

export function FilterBuilder({
  fields,
  conditions,
  onChange,
}: {
  fields: DatasetField[];
  conditions: SearchCondition[];
  onChange: (conditions: SearchCondition[]) => void;
}) {
  const filterableFields = useMemo(
    () =>
      fields.filter(
        ({ isFilterable, name }) => isFilterable && isSupportedField(name),
      ),
    [fields],
  );

  function updateCondition(index: number, condition: SearchCondition) {
    onChange(
      conditions.map((currentCondition, currentIndex) =>
        currentIndex === index ? condition : currentCondition,
      ),
    );
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, currentIndex) => currentIndex !== index));
  }

  function addCondition() {
    const field = filterableFields.find(({ name }) => isSupportedField(name));
    if (!field || !isSupportedField(field.name)) {
      return;
    }

    const operator = getOperators(field)[0];
    onChange([
      ...conditions,
      {
        field: field.name,
        operator,
        value: emptyValue(operator),
      },
    ]);
  }

  return (
    <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Filters</h2>
          <p className="mt-1 text-xs text-slate-500">
            Combine conditions to narrow the results.
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={filterableFields.length === 0 || conditions.length >= 25}
          onClick={addCondition}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add condition
        </button>
      </div>
      {conditions.map((condition, index) => (
        <ConditionRow
          condition={condition}
          fields={filterableFields}
          index={index}
          key={`${index}-${condition.field}-${condition.operator}`}
          onChange={updateCondition}
          onRemove={removeCondition}
        />
      ))}
      {conditions.length === 0 && (
        <p className="text-sm text-slate-500">No conditions added.</p>
      )}
    </div>
  );
}
