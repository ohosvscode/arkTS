export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer)
      resolve()
    }, ms)
  })
}

export namespace sleep {
  export function error(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(new Error(`Timeout after ${ms}ms`))
      }, ms)
    })
  }
}

export async function retry<T>(fn: () => Promise<T>, times: number, error: Error = new Error(`Retry execution ${fn.name} failed after ${times} times.`)): Promise<T> {
  try {
    return await fn()
  }
  catch (e) {
    if (times > 0) return retry(fn, times - 1, error)
    return await Promise.reject(error || e)
  }
}

export async function timeout<T>(fn: () => PromiseLike<T>, ms: number, error: Error = new Error(`Timeout execution ${fn.name} after ${ms}ms.`)): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer)
        reject(error)
      }, ms)
    }),
  ])
}

export function keepClassInstanceThis<T extends Record<string, any>>(target: T): T {
  const plainObject: T = {} as T
  const processedKeys = new Set<string>()

  // 获取原型链上的所有方法
  let proto = Object.getPrototypeOf(target)
  while (proto && proto !== Object.prototype) {
    const protoKeys = Object.getOwnPropertyNames(proto)
    for (const key of protoKeys) {
      if (key === 'constructor' || processedKeys.has(key)) continue

      const descriptor = Object.getOwnPropertyDescriptor(proto, key)
      if (descriptor && typeof descriptor.value === 'function') {
        processedKeys.add(key)
        const method = target[key]
        if (typeof method === 'function') {
          // eslint-disable-next-line ts/ban-ts-comment
          // @ts-expect-error
          plainObject[key] = (...args: unknown[]) => method.apply(target, args)
        }
      }
    }
    proto = Object.getPrototypeOf(proto)
  }

  // 获取实例自己的属性（包括实例属性和 getter/setter）
  const instanceKeys = Object.getOwnPropertyNames(target)
  for (const key of instanceKeys) {
    if (key === 'constructor' || processedKeys.has(key)) continue

    const descriptor = Object.getOwnPropertyDescriptor(target, key)
    if (!descriptor) continue

    processedKeys.add(key)
    const value = target[key]

    if (typeof value === 'function') {
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      plainObject[key] = (...args: unknown[]) => value.apply(target, args)
    }
    else if (descriptor.get || descriptor.set) {
      // 处理 getter/setter
      const propertyDescriptor: PropertyDescriptor = {}
      if (descriptor.get) {
        propertyDescriptor.get = () => descriptor.get!.call(target)
      }
      if (descriptor.set) {
        propertyDescriptor.set = (val: unknown) => descriptor.set!.call(target, val)
      }
      Object.defineProperty(plainObject, key, propertyDescriptor)
    }
    else {
      // eslint-disable-next-line ts/ban-ts-comment
      // @ts-expect-error
      plainObject[key] = value
    }
  }

  // 设置 toStringTag
  if (target.constructor && target.constructor.name) {
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-expect-error
    plainObject[Symbol.toStringTag] = `[bounded class ${target.constructor.name}]`
  }

  return plainObject as T
}
