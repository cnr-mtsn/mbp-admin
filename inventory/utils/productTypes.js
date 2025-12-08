const PRODUCT_TYPES = {
  paint: {
    label: 'Paint',
    fields: [
      { key: 'brand', label: 'Brand', type: 'string', required: true },
      { key: 'colorName', label: 'Color Name', type: 'string', required: true },
      { key: 'colorCode', label: 'Color Code', type: 'string', required: false },
      {
        key: 'sheen',
        label: 'Sheen',
        type: 'select',
        options: ['Flat', 'Matte', 'Eggshell', 'Satin', 'Semi-Gloss', 'Gloss'],
        required: true
      },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: ['Latex', 'Oil-Based', 'Primer', 'Enamel', 'Lacquer', 'Sealer'],
        required: true
      },
      { key: 'volume', label: null, type: 'decimal', required: true },
      {
        key: 'containerSize',
        label: 'Container Size',
        type: 'select',
        options: ['Quart', 'Gallon', '5 Gallon'],
        required: true
      },
      { key: 'jobName', label: 'Job Name', type: 'string', required: false },
      {
        key: 'surfaceType',
        label: 'Surface Type',
        type: 'select',
        options: ['Ceiling', 'Walls', 'Woodwork', 'Exterior'],
        required: false
      },
      {
        key: 'interiorOrExterior',
        label: 'Interior or Exterior',
        type: 'select',
        options: ['Interior', 'Exterior'],
        required: false
      }
    ]
  },
  stain: {
    label: 'Stain',
    fields: [
      { key: 'brand', label: 'Brand', type: 'string', required: true },
      { key: 'colorName', label: 'Color Name', type: 'string', required: true },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        options: ['Oil-Based', 'Water-Based', 'Gel'],
        required: true
      },
      {
        key: 'finish',
        label: 'Finish',
        type: 'select',
        options: ['Semi-transparent', 'Transparent', 'Solid'],
        required: true
      },
      { key: 'volume', label: null, type: 'decimal', required: true },
      {
        key: 'containerSize',
        label: 'Container Size',
        type: 'select',
        options: ['Quart', 'Gallon', '5 Gallon'],
        required: true
      },
      {
        key: 'interiorOrExterior',
        label: 'Interior or Exterior',
        type: 'select',
        options: ['Interior', 'Exterior'],
        required: false
      }
    ]
  },
  'masking-tape': {
    label: 'Masking Tape',
    fields: [
      { key: 'name', label: 'Name', type: 'string', required: true },
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        options: ['1/2 inch', '3/4 inch', '1 inch', '1.5 inch', '2 inch'],
        required: true
      }
    ]
  },
  'masking-paper': {
    label: 'Masking Paper',
    fields: [
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        options: ['6 inch', '9 inch', '12 inch'],
        required: true
      }
    ]
  },
  'masking-plastic': {
    label: 'Masking Plastic',
    fields: [
      {
        key: 'width',
        label: 'Width',
        type: 'select',
        options: ['36 inch', '48 inch', '72 inch', '99 inch'],
        required: true
      }
    ]
  }
};

export const getInitialAttributes = (productType) => {
  const definition = PRODUCT_TYPES[productType];
  if (!definition) return {};

  return definition.fields.reduce((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {});
};

export default PRODUCT_TYPES;
