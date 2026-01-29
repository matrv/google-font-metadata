import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { consola } from 'consola';
import stringify from 'json-stringify-pretty-compact';
import { dirname, join } from 'pathe';

import { isIconFont, stripIconsApiGen } from './icons-gen';
import { APIResponse, AxesFontObject, FontObjectVariableDirect } from './types';

interface APIResponseVF extends APIResponse {
  axes?: Array<{
    tag: string;
    start: number;
    end: number;
  }>;
}

interface APIGenResponseVF {
  items: APIResponseVF[];
}

const fetchURL = async (url: string): Promise<void> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Response code ${response.status} (${response.statusText})`,
    );
  }

  const items = (await response.json()) as APIGenResponseVF;

  // Before google had this API, we were getting this data by
  // scraping. For backwards compatibility, we need to transform
  // the data here.
  const finalArray: FontObjectVariableDirect[] = [];
  for (const font of items.items) {
    if (!font.axes || isIconFont(font.family)) continue;
    const newAxes: AxesFontObject = {};
    for (const axis of font.axes) {
      newAxes[axis.tag] = {
        min: axis.start.toString(),
        max: axis.end.toString(),
        step: '1',
        default: '500',
      };
    }

    finalArray.push({
      family: font.family,
      id: font.family.replaceAll(/\s/g, '-').toLowerCase(),
      axes: newAxes,
    });
  }

  await fs.writeFile(
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../data/variable-response.json',
    ),
    stringify(finalArray),
  );
};

const baseurl =
  'https://www.googleapis.com/webfonts/v1/webfonts?capability=VF&fields=items(category%2Cfamily%2ClastModified%2Csubsets%2Cvariants%2Cversion%2Caxes)&key=';

/**
 * This fetches the Google Fonts Developer API for all the basic metadata available.
 *
 * {@link https://developers.google.com/fonts/docs/developer_api#variable_fonts}
 * @param key Google API key
 */
export const fetchVariable = async (key: string) => {
  if (key) {
    try {
      await fetchURL(baseurl + key);
      consola.success('Successful Google Font API fetch (Variable fonts).');
    } catch (error) {
      throw new Error(`API fetch error: ${String(error)}`);
    }
  } else {
    throw new Error('The API key is required!');
  }
};
